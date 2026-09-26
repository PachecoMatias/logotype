import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import mysql from 'mysql2/promise';

import { parseEnvironment } from '../../src/config/env.js';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const migrationScript = path.join(backendDirectory, 'scripts', 'migrate.js');
const supportedMigrationCommands = new Set(['up', 'down']);
const migrationLockRegister = path.join(
  backendDirectory,
  'tests',
  'helpers',
  'migration-lock-register.mjs',
);

export function getTestConfiguration() {
  const configuration = parseEnvironment();

  if (configuration.environment !== 'test' || configuration.database.database !== 'logotype_test') {
    throw new Error('Migration tests require the guarded logotype_test database');
  }

  return configuration;
}

export function createTestPool() {
  const configuration = getTestConfiguration();

  return mysql.createPool({
    ...configuration.database,
    waitForConnections: true,
    timezone: 'Z',
  });
}

export async function resetMigrationTestState(pool) {
  await pool.query('DROP TABLE IF EXISTS historias');
  await pool.query('DROP TABLE IF EXISTS equipo');
  await pool.query('DROP TABLE IF EXISTS proyectos');
  await pool.query('DROP TABLE IF EXISTS schema_migrations');
}

export async function closeMigrationTestPool(pool) {
  try {
    await resetMigrationTestState(pool);
  } finally {
    await pool.end();
  }
}

export function runMigration(command, { lockResult } = {}) {
  if (!supportedMigrationCommands.has(command)) {
    return Promise.reject(new Error('Migration command must be exactly up or down'));
  }

  return new Promise((resolve, reject) => {
    const hasForcedLockResult = lockResult !== undefined;
    const arguments_ = hasForcedLockResult
      ? ['--import', migrationLockRegister, migrationScript, command]
      : [migrationScript, command];
    const environment = {
      ...process.env,
      NODE_ENV: 'test',
    };

    if (hasForcedLockResult) {
      environment.MIGRATION_TEST_GET_LOCK_RESULT = JSON.stringify(lockResult);
    }

    const child = spawn(process.execPath, arguments_, {
      cwd: backendDirectory,
      env: environment,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let standardError = '';

    child.stderr.on('data', (chunk) => {
      standardError += chunk;
    });

    child.once('error', () => reject(new Error('Migration command could not start')));
    child.once('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Migration command failed with exit code ${code}: ${standardError.trim()}`));
    });
  });
}
