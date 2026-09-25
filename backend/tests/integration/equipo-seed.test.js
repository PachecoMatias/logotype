import assert from 'node:assert/strict';
import test from 'node:test';

import { seedEquipo } from '../../seeds/equipo.seed.js';
import {
  closeMigrationTestPool,
  createTestPool,
  resetMigrationTestState,
  runMigration,
} from '../helpers/test-database.js';

const canonicalRoster = [
  ['Desarrollador Frontend', 'Alto rendimiento', 3],
  ['Desarrollador Backend', 'Alto rendimiento', 3],
  ['Analista QA', 'Alto rendimiento', 2],
  ['Analista de Ciberseguridad', 'Alto rendimiento', 1],
  ['Analista de requerimientos', 'Administrativo', 2],
  ['Project Manager', 'Administrativo', 1],
];

async function prepareSeedSchema(t) {
  const pool = createTestPool();

  t.after(async () => {
    await closeMigrationTestPool(pool);
  });

  await resetMigrationTestState(pool);
  await runMigration('up');

  return pool;
}

async function getCanonicalRows(pool) {
  const [rows] = await pool.query(`
    SELECT rol, perfil, cantidad
    FROM equipo
    WHERE (rol, perfil) IN (
      ('Desarrollador Frontend', 'Alto rendimiento'),
      ('Desarrollador Backend', 'Alto rendimiento'),
      ('Analista QA', 'Alto rendimiento'),
      ('Analista de Ciberseguridad', 'Alto rendimiento'),
      ('Analista de requerimientos', 'Administrativo'),
      ('Project Manager', 'Administrativo')
    )
    ORDER BY rol ASC, perfil ASC
  `);

  return rows;
}

test('seeds the exact canonical aggregate roster without individual names', async (t) => {
  const pool = await prepareSeedSchema(t);
  const connection = await pool.getConnection();

  try {
    await seedEquipo(connection);
  } finally {
    connection.release();
  }

  const rows = await getCanonicalRows(pool);
  const quantities = rows.map((row) => row.cantidad).sort((left, right) => left - right);

  assert.equal(rows.length, 6);
  assert.deepEqual(quantities, [1, 1, 2, 2, 3, 3]);
  assert.equal(
    rows.reduce((total, row) => total + row.cantidad, 0),
    12,
  );
  assert.deepEqual(
    rows.map((row) => [row.rol, row.perfil, row.cantidad]).sort(),
    [...canonicalRoster].sort(),
  );
});

test('reseeding corrects only managed quantities and preserves an unrelated valid pair', async (t) => {
  const pool = await prepareSeedSchema(t);
  const connection = await pool.getConnection();

  try {
    await connection.execute('INSERT INTO equipo (rol, perfil, cantidad) VALUES (?, ?, ?)', [
      'Project Manager',
      'Alto rendimiento',
      7,
    ]);
    await seedEquipo(connection);
    await connection.execute(
      "UPDATE equipo SET cantidad = 99 WHERE rol = 'Desarrollador Backend' AND perfil = 'Alto rendimiento'",
    );
    await seedEquipo(connection);
  } finally {
    connection.release();
  }

  const rows = await getCanonicalRows(pool);
  const [unrelated] = await pool.execute(
    "SELECT cantidad FROM equipo WHERE rol = 'Project Manager' AND perfil = 'Alto rendimiento'",
  );

  assert.equal(rows.length, 6);
  assert.equal(
    rows.reduce((total, row) => total + row.cantidad, 0),
    12,
  );
  assert.equal(
    rows.find((row) => row.rol === 'Desarrollador Backend' && row.perfil === 'Alto rendimiento')
      .cantidad,
    3,
  );
  assert.equal(unrelated[0].cantidad, 7);
});

test('rolls back the full roster when one seed statement fails', async (t) => {
  const pool = await prepareSeedSchema(t);
  const connection = await pool.getConnection();
  const invalidRoster = canonicalRoster.map(([rol, perfil, cantidad]) => ({
    rol,
    perfil,
    cantidad,
  }));

  invalidRoster[5] = { rol: 'Invalid role', perfil: 'Administrativo', cantidad: 1 };

  try {
    await assert.rejects(seedEquipo(connection, invalidRoster));
  } finally {
    connection.release();
  }

  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM equipo');
  assert.equal(rows[0].count, 0);
});
