import assert from 'node:assert/strict';
import test from 'node:test';

import {
  closeMigrationTestPool,
  createTestPool,
  getTestConfiguration,
  resetMigrationTestState,
  runMigration,
} from '../helpers/test-database.js';

async function prepareMigratedSchema(t) {
  const pool = createTestPool();

  t.after(async () => {
    await closeMigrationTestPool(pool);
  });

  await resetMigrationTestState(pool);
  await runMigration('up');

  return pool;
}

const interruptedMigration = {
  name: '003_create_equipo',
  table: 'equipo',
};

async function setInterruptedMigrationState(pool, state, targetExists) {
  await pool.execute(
    `
      UPDATE schema_migrations
      SET state = ?, applied_at = CASE WHEN ? = 'applying' THEN NULL ELSE applied_at END
      WHERE migration_name = ?
    `,
    [state, state, interruptedMigration.name],
  );

  if (!targetExists) {
    await pool.query(`DROP TABLE ${interruptedMigration.table}`);
  }
}

async function getMigrationRecord(pool) {
  const [rows] = await pool.execute(
    `
      SELECT migration_name, checksum, state, applied_at
      FROM schema_migrations
      WHERE migration_name = ?
    `,
    [interruptedMigration.name],
  );

  return rows[0];
}

async function targetTableExists(pool) {
  const [rows] = await pool.execute(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND TABLE_TYPE = 'BASE TABLE'
    `,
    [interruptedMigration.table],
  );

  return rows.length === 1;
}

async function assertNoMigrationMutation(pool) {
  const [tables] = await pool.query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN ('schema_migrations', 'proyectos', 'historias', 'equipo')
  `);

  assert.deepEqual(tables, []);
}

test('applies and reverses the guarded planning schema in order', async (t) => {
  const configuration = getTestConfiguration();
  const pool = createTestPool();

  t.after(async () => {
    await closeMigrationTestPool(pool);
  });

  assert.equal(configuration.database.database, 'logotype_test');
  assert.notEqual(configuration.database.database, 'logotype');

  await resetMigrationTestState(pool);

  await runMigration('up');

  const [tables] = await pool.query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN ('proyectos', 'historias', 'equipo')
    ORDER BY TABLE_NAME
  `);

  assert.deepEqual(
    tables.map((table) => table.TABLE_NAME),
    ['equipo', 'historias', 'proyectos'],
  );

  const [history] = await pool.query(
    'SELECT migration_name, state FROM schema_migrations ORDER BY migration_name ASC',
  );
  const [historyColumns] = await pool.query(`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'schema_migrations'
    ORDER BY ORDINAL_POSITION
  `);

  assert.deepEqual(history, [
    { migration_name: '001_create_proyectos', state: 'applied' },
    { migration_name: '002_create_historias', state: 'applied' },
    { migration_name: '003_create_equipo', state: 'applied' },
  ]);
  assert.deepEqual(
    historyColumns.map((column) => column.COLUMN_NAME),
    ['migration_name', 'checksum', 'state', 'applied_at', 'updated_at'],
  );
  assert.equal(historyColumns[0].COLUMN_TYPE, 'varchar(255)');
  assert.equal(historyColumns[1].COLUMN_TYPE, 'binary(32)');
  assert.equal(historyColumns[2].COLUMN_TYPE, 'varchar(16)');

  await runMigration('down');
  await runMigration('down');
  await runMigration('down');

  const [remainingTables] = await pool.query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN ('proyectos', 'historias', 'equipo')
  `);

  assert.deepEqual(remainingTables, []);
});

test('creates the project table with server-owned state and JSON-object protection', async (t) => {
  const pool = await prepareMigratedSchema(t);
  const [columns] = await pool.query(`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLLATION_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos'
    ORDER BY ORDINAL_POSITION
  `);

  assert.deepEqual(
    columns.map((column) => column.COLUMN_NAME),
    ['id', 'payload', 'estado', 'creado_en', 'actualizado_en'],
  );
  assert.equal(columns[0].COLUMN_TYPE, 'int unsigned');
  assert.equal(columns[1].COLUMN_TYPE, 'json');
  assert.equal(columns[2].COLUMN_DEFAULT, 'nuevo');
  assert.equal(columns[2].COLLATION_NAME, 'utf8mb4_0900_as_cs');
  assert.equal(columns[3].COLUMN_TYPE, 'datetime(6)');
  assert.match(columns[4].EXTRA, /on update CURRENT_TIMESTAMP\(6\)$/);

  await assert.rejects(
    pool.execute("INSERT INTO proyectos (payload, estado) VALUES (CAST(? AS JSON), 'nuevo')", [
      JSON.stringify([]),
    ]),
  );
  await pool.execute("INSERT INTO proyectos (payload, estado) VALUES (CAST(? AS JSON), 'nuevo')", [
    JSON.stringify({ empresa: {} }),
  ]);
});

test('creates the story and team foundations with enforced relations and canonical constraints', async (t) => {
  const pool = await prepareMigratedSchema(t);
  const [constrainedColumns] = await pool.query(`
    SELECT TABLE_NAME, COLUMN_NAME, COLLATION_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND (TABLE_NAME, COLUMN_NAME) IN (
        ('historias', 'prioridad'),
        ('historias', 'rol_sugerido'),
        ('historias', 'fase'),
        ('historias', 'columna_tablero'),
        ('equipo', 'rol'),
        ('equipo', 'perfil')
      )
  `);

  assert.equal(constrainedColumns.length, 6);
  assert.ok(constrainedColumns.every((column) => column.COLLATION_NAME === 'utf8mb4_0900_as_cs'));

  await assert.rejects(
    pool.execute(
      `
        INSERT INTO historias (
          proyecto_id, prioridad, historia_usuario, descripcion, criterios_aceptacion,
          alcance_tecnico, estimacion_fibonacci, rol_sugerido, fase, columna_tablero
        ) VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?)
      `,
      [
        999999,
        'Alta',
        'As a user',
        'A story description',
        JSON.stringify(['Accepted']),
        'Technical scope',
        3,
        'Desarrollador Backend',
        'Desarrollo Backend',
        'Backlog',
      ],
    ),
  );
  await assert.rejects(
    pool.execute('INSERT INTO equipo (rol, perfil, cantidad) VALUES (?, ?, ?)', [
      'desarrollador backend',
      'Alto rendimiento',
      1,
    ]),
  );
  await pool.execute('INSERT INTO equipo (rol, perfil, cantidad) VALUES (?, ?, ?)', [
    'Desarrollador Backend',
    'Alto rendimiento',
    3,
  ]);
  await assert.rejects(
    pool.execute('INSERT INTO equipo (rol, perfil, cantidad) VALUES (?, ?, ?)', [
      'Desarrollador Backend',
      'Alto rendimiento',
      3,
    ]),
  );
});

test('refuses untracked tables and contradictory applied history', async (t) => {
  const pool = createTestPool();

  t.after(async () => {
    await closeMigrationTestPool(pool);
  });

  await resetMigrationTestState(pool);
  await pool.query('CREATE TABLE proyectos (id INT UNSIGNED NOT NULL PRIMARY KEY)');
  await assert.rejects(runMigration('up'), /exit code 1/);
  await resetMigrationTestState(pool);

  await runMigration('up');
  await pool.query('DROP TABLE equipo');
  await assert.rejects(runMigration('up'), /exit code 1/);
});

test('finalizes an applying migration when its target table already exists', async (t) => {
  const pool = await prepareMigratedSchema(t);

  await setInterruptedMigrationState(pool, 'applying', true);

  await runMigration('up');

  const record = await getMigrationRecord(pool);
  assert.equal(record.state, 'applied');
  assert.notEqual(record.applied_at, null);
  assert.equal(await targetTableExists(pool), true);
});

test('deletes an applying intent when its target table is absent before retrying', async (t) => {
  const pool = await prepareMigratedSchema(t);

  await setInterruptedMigrationState(pool, 'applying', false);

  await runMigration('up');

  const record = await getMigrationRecord(pool);
  assert.equal(record.state, 'applied');
  assert.notEqual(record.applied_at, null);
  assert.equal(await targetTableExists(pool), true);
});

test('deletes rolling-back history when its target table is already absent', async (t) => {
  const pool = await prepareMigratedSchema(t);

  await setInterruptedMigrationState(pool, 'rolling_back', false);

  await runMigration('up');

  const record = await getMigrationRecord(pool);
  assert.equal(record.state, 'applied');
  assert.notEqual(record.applied_at, null);
  assert.equal(await targetTableExists(pool), true);
});

test('restores an applied migration when rolling back was interrupted before DDL', async (t) => {
  const pool = await prepareMigratedSchema(t);

  await setInterruptedMigrationState(pool, 'rolling_back', true);

  await runMigration('up');

  const record = await getMigrationRecord(pool);
  assert.equal(record.state, 'applied');
  assert.notEqual(record.applied_at, null);
  assert.equal(await targetTableExists(pool), true);
});

test('refuses checksum drift before reconciling history in every recorded state', async (t) => {
  for (const { state, targetExists } of [
    { state: 'applying', targetExists: true },
    { state: 'applied', targetExists: true },
    { state: 'rolling_back', targetExists: false },
  ]) {
    await t.test(`refuses drift for ${state}`, async (t) => {
      const pool = await prepareMigratedSchema(t);
      const driftedChecksum = Buffer.alloc(32);

      await setInterruptedMigrationState(pool, state, targetExists);
      await pool.execute('UPDATE schema_migrations SET checksum = ? WHERE migration_name = ?', [
        driftedChecksum,
        interruptedMigration.name,
      ]);

      await assert.rejects(runMigration('up'), /Migration checksum drift detected/);

      const record = await getMigrationRecord(pool);
      assert.equal(record.state, state);
      assert.deepEqual(record.checksum, driftedChecksum);
      assert.equal(await targetTableExists(pool), targetExists);
    });
  }
});

test('refuses every non-acquired advisory-lock result without mutating schema state', async (t) => {
  const pool = createTestPool();

  t.after(async () => {
    await closeMigrationTestPool(pool);
  });

  for (const lockResult of [0, null, 2]) {
    await t.test(`GET_LOCK result ${String(lockResult)}`, async () => {
      await resetMigrationTestState(pool);

      await assert.rejects(runMigration('up', { lockResult }), /exit code 1/);

      await assertNoMigrationMutation(pool);
    });
  }
});
