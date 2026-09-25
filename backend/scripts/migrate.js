import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { closePool, getPool } from '../src/config/database.js';
import { parseEnvironment } from '../src/config/env.js';

const migrationsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations',
);
const migrations = [
  { name: '001_create_proyectos', table: 'proyectos' },
  { name: '002_create_historias', table: 'historias' },
  { name: '003_create_equipo', table: 'equipo' },
];

const schemaMigrationsStatement = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_name VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    checksum BINARY(32) NOT NULL,
    state VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    applied_at DATETIME(6) NULL,
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT pk_schema_migrations PRIMARY KEY (migration_name),
    CONSTRAINT chk_schema_migrations_state
      CHECK (state IN ('applying', 'applied', 'rolling_back')),
    CONSTRAINT chk_schema_migrations_applied_at
      CHECK (
        (state = 'applying' AND applied_at IS NULL)
        OR (state IN ('applied', 'rolling_back') AND applied_at IS NOT NULL)
      )
  ) ENGINE=InnoDB
    DEFAULT CHARACTER SET ascii
    COLLATE ascii_bin
`;

function usageError() {
  throw new Error('Migration command must be either up or down');
}

function pairChecksum(upSql, downSql) {
  const upLength = Buffer.alloc(8);
  const downLength = Buffer.alloc(8);

  upLength.writeBigUInt64BE(BigInt(upSql.length));
  downLength.writeBigUInt64BE(BigInt(downSql.length));

  return createHash('sha256')
    .update(upLength)
    .update(upSql)
    .update(downLength)
    .update(downSql)
    .digest();
}

async function loadMigrations() {
  return Promise.all(
    migrations.map(async (migration) => {
      const upPath = path.join(migrationsDirectory, `${migration.name}.up.sql`);
      const downPath = path.join(migrationsDirectory, `${migration.name}.down.sql`);
      const [upBytes, downBytes] = await Promise.all([readFile(upPath), readFile(downPath)]);

      return {
        ...migration,
        checksum: pairChecksum(upBytes, downBytes),
        downSql: downBytes.toString('utf8'),
        upSql: upBytes.toString('utf8'),
      };
    }),
  );
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.execute(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND TABLE_TYPE = 'BASE TABLE'
    `,
    [tableName],
  );

  return rows.length === 1;
}

async function getLockName(connection) {
  const [rows] = await connection.query(
    "SELECT CONCAT('logotype:', LEFT(SHA2(DATABASE(), 256), 48)) AS lock_name",
  );

  return rows[0].lock_name;
}

async function acquireLock(connection, lockName) {
  const [rows] = await connection.execute('SELECT GET_LOCK(?, 10) AS acquired', [lockName]);
  const acquired = rows[0]?.acquired;

  if (acquired !== 1) {
    throw new Error('Migration lock could not be acquired');
  }
}

async function loadHistoryRows(connection) {
  const [rows] = await connection.query(
    `
      SELECT migration_name, checksum, state, applied_at
      FROM schema_migrations
      ORDER BY migration_name ASC
    `,
  );

  return rows;
}

function validateHistory(rows, definitions) {
  const knownNames = new Set(definitions.map((definition) => definition.name));
  const definitionsByName = new Map(definitions.map((definition) => [definition.name, definition]));

  for (const row of rows) {
    if (!knownNames.has(row.migration_name)) {
      throw new Error('Migration history contains an unknown migration');
    }

    const definition = definitionsByName.get(row.migration_name);

    if (!Buffer.from(row.checksum).equals(definition.checksum)) {
      throw new Error('Migration checksum drift detected');
    }
  }

  return definitionsByName;
}

async function reconcileHistory(connection, rows, definitionsByName) {
  const history = new Map(rows.map((row) => [row.migration_name, row]));

  for (const row of rows) {
    const definition = definitionsByName.get(row.migration_name);

    if (row.state === 'applied') {
      if (!(await tableExists(connection, definition.table))) {
        throw new Error('Applied migration target table is missing');
      }

      continue;
    }

    const targetExists = await tableExists(connection, definition.table);

    if (row.state === 'applying' && targetExists) {
      await connection.execute(
        `
          UPDATE schema_migrations
          SET state = 'applied', applied_at = CURRENT_TIMESTAMP(6)
          WHERE migration_name = ?
        `,
        [definition.name],
      );
      history.set(definition.name, { ...row, state: 'applied' });
      continue;
    }

    if (row.state === 'rolling_back' && targetExists) {
      await connection.execute(
        "UPDATE schema_migrations SET state = 'applied' WHERE migration_name = ?",
        [definition.name],
      );
      history.set(definition.name, { ...row, state: 'applied' });
      continue;
    }

    if (row.state === 'applying' || row.state === 'rolling_back') {
      await connection.execute('DELETE FROM schema_migrations WHERE migration_name = ?', [
        definition.name,
      ]);
      history.delete(definition.name);
      continue;
    }

    throw new Error('Migration history contains an invalid state');
  }

  return history;
}

async function loadHistory(connection, definitions) {
  const rows = await loadHistoryRows(connection);
  const definitionsByName = validateHistory(rows, definitions);

  return reconcileHistory(connection, rows, definitionsByName);
}

async function applyPendingMigrations(connection, definitions, history) {
  for (const definition of definitions) {
    if (history.has(definition.name)) {
      continue;
    }

    if (await tableExists(connection, definition.table)) {
      throw new Error('Migration target table exists without migration history');
    }

    await connection.execute(
      `
        INSERT INTO schema_migrations (migration_name, checksum, state, applied_at)
        VALUES (?, ?, 'applying', NULL)
      `,
      [definition.name, definition.checksum],
    );
    await connection.query(definition.upSql);
    await connection.execute(
      `
        UPDATE schema_migrations
        SET state = 'applied', applied_at = CURRENT_TIMESTAMP(6)
        WHERE migration_name = ?
      `,
      [definition.name],
    );
  }
}

async function rollbackLatestMigration(connection, definitions, history) {
  const latestApplied = [...definitions]
    .reverse()
    .find((definition) => history.has(definition.name));

  if (!latestApplied) {
    return;
  }

  if (!(await tableExists(connection, latestApplied.table))) {
    throw new Error('Applied migration target table is missing');
  }

  await connection.execute(
    "UPDATE schema_migrations SET state = 'rolling_back' WHERE migration_name = ?",
    [latestApplied.name],
  );
  await connection.query(latestApplied.downSql);
  await connection.execute('DELETE FROM schema_migrations WHERE migration_name = ?', [
    latestApplied.name,
  ]);
}

async function run(command) {
  if (!['up', 'down'].includes(command)) {
    usageError();
  }

  const configuration = parseEnvironment();
  let connection;
  let lockName;
  let lockAcquired = false;

  try {
    connection = await getPool(configuration).getConnection();
    lockName = await getLockName(connection);
    await acquireLock(connection, lockName);
    lockAcquired = true;
    await connection.query(schemaMigrationsStatement);

    const definitions = await loadMigrations();
    const history = await loadHistory(connection, definitions);

    if (command === 'up') {
      await applyPendingMigrations(connection, definitions, history);
    } else {
      await rollbackLatestMigration(connection, definitions, history);
    }
  } finally {
    try {
      if (lockAcquired) {
        await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
      }
    } finally {
      try {
        connection?.release();
      } finally {
        await closePool();
      }
    }
  }
}

run(process.argv[2]).catch((error) => {
  const message = error instanceof Error ? error.message : 'Unexpected migration failure';

  console.error(`Migration command failed: ${message}`);
  process.exitCode = 1;
});
