import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createDatabaseClient } from '../../src/config/database.js';
import { parseEnvironment } from '../../src/config/env.js';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repositoryDirectory = path.resolve(backendDirectory, '..');

const expectedScripts = {
  start: 'node src/server.js',
  dev: 'node --watch src/server.js',
  'db:migrate': 'node scripts/migrate.js up',
  'db:rollback': 'node scripts/migrate.js down',
  'db:migrate:test': 'cross-env NODE_ENV=test node scripts/migrate.js up',
  'db:rollback:test': 'cross-env NODE_ENV=test node scripts/migrate.js down',
  'db:seed': 'node scripts/seed.js',
  'db:seed:test': 'cross-env NODE_ENV=test node scripts/seed.js',
  test: 'cross-env NODE_ENV=test node --test --test-concurrency=1',
  lint: 'eslint . --max-warnings=0',
  format: 'prettier --write .',
  'format:check': 'prettier --check .',
};

function applicationEnvironment() {
  return {
    NODE_ENV: 'development',
    MYSQL_HOST: '127.0.0.1',
    MYSQL_USER: 'application-user',
    MYSQL_PASSWORD: '',
    MYSQL_DATABASE: 'logotype',
  };
}

function testEnvironment() {
  return {
    NODE_ENV: 'test',
    MYSQL_DATABASE: 'logotype',
    MYSQL_TEST_HOST: '127.0.0.1',
    MYSQL_TEST_USER: 'test-user',
    MYSQL_TEST_PASSWORD: '',
    MYSQL_TEST_DATABASE: 'logotype_test',
    TEST_DB_RESET_ALLOWED: 'true',
  };
}

test('package scripts use only approved fixed local entry points', async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(backendDirectory, 'package.json'), 'utf8'),
  );

  assert.deepEqual(packageJson.scripts, expectedScripts);
});

test('environment example uses placeholders and the ignored local path', async () => {
  const environmentExample = await readFile(path.join(backendDirectory, '.env.example'), 'utf8');

  assert.match(environmentExample, /^MYSQL_PASSWORD=replace-with-application-password$/m);
  assert.match(environmentExample, /^MYSQL_TEST_PASSWORD=replace-with-test-password$/m);
  assert.match(environmentExample, /^MYSQL_DATABASE=logotype$/m);
  assert.match(environmentExample, /^MYSQL_TEST_DATABASE=logotype_test$/m);

  assert.doesNotThrow(() => {
    execFileSync('git', ['check-ignore', '--quiet', 'backend/.env'], {
      cwd: repositoryDirectory,
      stdio: 'ignore',
    });
  });
});

test('environment parsing uses the selected namespace and rejects unsafe test settings', () => {
  const application = parseEnvironment(applicationEnvironment());
  const testConfiguration = parseEnvironment(testEnvironment());

  assert.equal(application.database.database, 'logotype');
  assert.equal(application.database.user, 'application-user');
  assert.equal(testConfiguration.database.database, 'logotype_test');
  assert.equal(testConfiguration.database.user, 'test-user');

  assert.throws(
    () => parseEnvironment({ ...testEnvironment(), MYSQL_TEST_USER: undefined }),
    /MYSQL_TEST_USER/,
  );
  assert.throws(
    () => parseEnvironment({ ...testEnvironment(), MYSQL_TEST_DATABASE: 'logotype' }),
    /must end in _test/,
  );
  assert.throws(
    () => parseEnvironment({ ...testEnvironment(), MYSQL_DATABASE: 'logotype_test' }),
    /must differ from MYSQL_DATABASE/,
  );
  assert.throws(
    () => parseEnvironment({ ...applicationEnvironment(), NODE_ENV: 'staging' }),
    /NODE_ENV/,
  );
});

test('database client pings, releases transactions, and closes its pool', async () => {
  const calls = [];
  const connection = {
    async beginTransaction() {
      calls.push('begin');
    },
    async commit() {
      calls.push('commit');
    },
    release() {
      calls.push('release');
    },
    async rollback() {
      calls.push('rollback');
    },
  };
  const pool = {
    async end() {
      calls.push('end');
    },
    async getConnection() {
      calls.push('getConnection');
      return connection;
    },
    async query(statement) {
      calls.push(`query:${statement}`);
    },
  };
  let poolOptions;
  const databaseClient = createDatabaseClient((options) => {
    poolOptions = options;
    return pool;
  });
  const configuration = parseEnvironment(testEnvironment());

  await databaseClient.pingDatabase(configuration);
  assert.equal(
    await databaseClient.withTransaction(configuration, async () => 'committed'),
    'committed',
  );
  await assert.rejects(
    databaseClient.withTransaction(configuration, async () => {
      throw new Error('transaction failure');
    }),
    /transaction failure/,
  );
  await databaseClient.closePool();

  assert.deepEqual(poolOptions, {
    ...configuration.database,
    waitForConnections: true,
    timezone: 'Z',
  });
  assert.deepEqual(calls, [
    'query:SELECT 1',
    'getConnection',
    'begin',
    'commit',
    'release',
    'getConnection',
    'begin',
    'rollback',
    'release',
    'end',
  ]);
});
