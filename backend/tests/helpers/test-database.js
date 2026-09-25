import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import mysql from 'mysql2/promise';

import { parseEnvironment } from '../../src/config/env.js';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const migrationScript = path.join(backendDirectory, 'scripts', 'migrate.js');

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

export function runMigration(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [migrationScript, command], {
      cwd: backendDirectory,
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: 'ignore',
    });

    child.once('error', () => reject(new Error('Migration command could not start')));
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Migration command failed with exit code ${code}`));
    });
  });
}
