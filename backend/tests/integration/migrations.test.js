import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTestPool,
  getTestConfiguration,
  resetMigrationTestState,
  runMigration,
} from '../helpers/test-database.js';

async function prepareMigratedSchema(t) {
  const pool = createTestPool();

  t.after(async () => {
    await resetMigrationTestState(pool);
    await pool.end();
  });

  await resetMigrationTestState(pool);
  await runMigration('up');

  return pool;
}

test('applies and reverses the guarded planning schema in order', async (t) => {
  const configuration = getTestConfiguration();
  const pool = createTestPool();

  t.after(async () => {
    await resetMigrationTestState(pool);
    await pool.end();
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
    await resetMigrationTestState(pool);
    await pool.end();
  });

  await resetMigrationTestState(pool);
  await pool.query('CREATE TABLE proyectos (id INT UNSIGNED NOT NULL PRIMARY KEY)');
  await assert.rejects(runMigration('up'), /exit code 1/);
  await resetMigrationTestState(pool);

  await runMigration('up');
  await pool.query('DROP TABLE equipo');
  await assert.rejects(runMigration('up'), /exit code 1/);
});
