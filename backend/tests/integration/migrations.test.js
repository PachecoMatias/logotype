import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const analysisMigration = '004_add_project_ai_analysis';
const backlogMigration = '005_enable_backlog_planning';
const validAnalysis = {
  viable: true,
  completitud: 'completo',
  campos_faltantes: [],
  observaciones: 'A guarded migration fixture.',
  mensaje_para_cliente: 'A guarded migration fixture.',
};

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

async function analysisChecksum() {
  const migrationsDirectory = path.join(backendDirectory, 'migrations');
  let upSql;
  let downSql;

  try {
    [upSql, downSql] = await Promise.all([
      readFile(path.join(migrationsDirectory, `${analysisMigration}.up.sql`)),
      readFile(path.join(migrationsDirectory, `${analysisMigration}.down.sql`)),
    ]);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      assert.fail('Migration 004 SQL files are not implemented yet');
    }

    throw error;
  }

  return pairChecksum(upSql, downSql);
}

async function setAnalysisHistory(pool, state) {
  await pool.execute(
    `
      INSERT INTO schema_migrations (migration_name, checksum, state, applied_at)
      VALUES (?, ?, ?, CASE WHEN ? = 'applying' THEN NULL ELSE CURRENT_TIMESTAMP(6) END)
    `,
    [analysisMigration, await analysisChecksum(), state, state],
  );
}

async function getAnalysisHistory(pool) {
  const [rows] = await pool.execute(
    'SELECT migration_name, state, applied_at FROM schema_migrations WHERE migration_name = ?',
    [analysisMigration],
  );

  return rows[0] ?? null;
}

async function createAnalysisColumn(pool) {
  await pool.query('ALTER TABLE proyectos ADD COLUMN analisis_ia JSON NULL AFTER estado');
}

async function addAnalysisObjectCheck(pool) {
  await pool.query(`
    ALTER TABLE proyectos
      ADD CONSTRAINT chk_proyectos_analisis_ia_objeto
      CHECK (analisis_ia IS NULL OR JSON_TYPE(analisis_ia) = 'OBJECT')
  `);
}

async function expandStatusCheck(pool) {
  await pool.query(`
    ALTER TABLE proyectos
      DROP CHECK chk_proyectos_estado,
      ADD CONSTRAINT chk_proyectos_estado CHECK (estado IN ('nuevo', 'analizado'))
  `);
}

async function applyAnalysisTarget(pool) {
  await createAnalysisColumn(pool);
  await addAnalysisObjectCheck(pool);
  await expandStatusCheck(pool);
}

function canonicalizeCheckClause(clause) {
  return clause
    .toLowerCase()
    .replaceAll('`', '')
    .replaceAll('\\', '')
    .replaceAll('_utf8mb4', '')
    .replaceAll('(', '')
    .replaceAll(')', '')
    .replaceAll(' ', '');
}

async function assertAnalysisTarget(pool) {
  const [columns] = await pool.query(`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos'
    ORDER BY ORDINAL_POSITION
  `);
  const [checks] = await pool.query(`
    SELECT tc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
      ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
      AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
    WHERE tc.TABLE_SCHEMA = DATABASE() AND tc.TABLE_NAME = 'proyectos'
  `);
  const analysisColumn = columns.find((column) => column.COLUMN_NAME === 'analisis_ia');
  const objectCheck = checks.find(
    (check) => check.CONSTRAINT_NAME === 'chk_proyectos_analisis_ia_objeto',
  );
  const statusCheck = checks.find((check) => check.CONSTRAINT_NAME === 'chk_proyectos_estado');

  assert.deepEqual(analysisColumn, {
    COLUMN_NAME: 'analisis_ia',
    COLUMN_TYPE: 'json',
    IS_NULLABLE: 'YES',
  });
  assert.equal(
    canonicalizeCheckClause(objectCheck?.CHECK_CLAUSE ?? ''),
    "analisis_iaisnullorjson_typeanalisis_ia='object'",
  );
  assert.ok(
    ["estadoin'nuevo','analizado'", "estadoin'nuevo','analizado','planificado'"].includes(
      canonicalizeCheckClause(statusCheck?.CHECK_CLAUSE ?? ''),
    ),
  );
}

async function preparePreAnalysisSchema(t) {
  const pool = createTestPool();

  t.after(async () => {
    await closeMigrationTestPool(pool);
  });

  await resetMigrationTestState(pool);
  await runMigration('up');
  await runMigration('down');

  return pool;
}

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
    { migration_name: '004_add_project_ai_analysis', state: 'applied' },
    { migration_name: '005_enable_backlog_planning', state: 'applied' },
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
    ['id', 'payload', 'estado', 'analisis_ia', 'creado_en', 'actualizado_en'],
  );
  assert.equal(columns[0].COLUMN_TYPE, 'int unsigned');
  assert.equal(columns[1].COLUMN_TYPE, 'json');
  assert.equal(columns[2].COLUMN_DEFAULT, 'nuevo');
  assert.equal(columns[2].COLLATION_NAME, 'utf8mb4_0900_as_cs');
  assert.equal(columns[3].COLUMN_TYPE, 'json');
  assert.equal(columns[3].IS_NULLABLE, 'YES');
  assert.equal(columns[4].COLUMN_TYPE, 'datetime(6)');
  assert.match(columns[5].EXTRA, /on update CURRENT_TIMESTAMP\(6\)$/);

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

test('applies migration 004 only after its exact nullable JSON target is verified and preserves prior bytes', async (t) => {
  const pool = createTestPool();
  const migrationsDirectory = path.join(backendDirectory, 'migrations');
  const priorMigrationFiles = await Promise.all(
    ['001_create_proyectos', '002_create_historias', '003_create_equipo'].flatMap((name) => [
      path.join(migrationsDirectory, `${name}.up.sql`),
      path.join(migrationsDirectory, `${name}.down.sql`),
    ]),
  );
  const priorBytes = await Promise.all(priorMigrationFiles.map((file) => readFile(file)));

  t.after(async () => {
    await closeMigrationTestPool(pool);
  });

  await resetMigrationTestState(pool);
  await runMigration('up');
  await assertAnalysisTarget(pool);

  const [projects] = await pool.query('SELECT estado, analisis_ia FROM proyectos');
  const analysisRecord = await getAnalysisHistory(pool);
  const currentBytes = await Promise.all(priorMigrationFiles.map((file) => readFile(file)));

  assert.deepEqual(projects, []);
  assert.equal(analysisRecord?.migration_name, analysisMigration);
  assert.equal(analysisRecord?.state, 'applied');
  assert.notEqual(analysisRecord?.applied_at, null);
  assert.deepEqual(currentBytes, priorBytes);
});

test('classifies source, target, and recognized migration 004 ALTER recovery states deterministically', async (t) => {
  const supportedStates = [
    {
      name: 'exact target without history',
      async arrange(pool) {
        await applyAnalysisTarget(pool);
      },
    },
    {
      name: 'applying target',
      async arrange(pool) {
        await applyAnalysisTarget(pool);
        await setAnalysisHistory(pool, 'applying');
      },
    },
    {
      name: 'column only',
      arrange: createAnalysisColumn,
    },
    {
      name: 'column and object check with source status',
      async arrange(pool) {
        await createAnalysisColumn(pool);
        await addAnalysisObjectCheck(pool);
      },
    },
    {
      name: 'target status without analysis column or check',
      arrange: expandStatusCheck,
    },
  ];

  for (const supportedState of supportedStates) {
    await t.test(`completes ${supportedState.name} with fixed migration-owned clauses`, async (t) => {
      const pool = await preparePreAnalysisSchema(t);

      await supportedState.arrange(pool);
      await runMigration('up');

      await assertAnalysisTarget(pool);
      assert.equal(
        (await getAnalysisHistory(pool))?.state,
        'applied',
        'Migration 004 history is not recorded after target verification',
      );
    });
  }
});

test('recognizes the migration-004 two-state source status while rejecting case and value drift', async (t) => {
  const pool = await preparePreAnalysisSchema(t);
  const [sourceChecks] = await pool.query(`
    SELECT cc.CHECK_CLAUSE
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
      ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
      AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
    WHERE tc.TABLE_SCHEMA = DATABASE()
      AND tc.TABLE_NAME = 'proyectos'
      AND tc.CONSTRAINT_NAME = 'chk_proyectos_estado'
  `);

  assert.equal(
    canonicalizeCheckClause(sourceChecks[0]?.CHECK_CLAUSE ?? ''),
    "estadoin'nuevo','analizado'",
  );
  await runMigration('up');
  await assertAnalysisTarget(pool);

  await runMigration('down');
  await pool.query(`
    ALTER TABLE proyectos
      DROP CHECK chk_proyectos_estado,
      ADD CONSTRAINT chk_proyectos_estado CHECK (estado = 'Nuevo')
  `);
  await assert.rejects(runMigration('up'), /ambiguous|incompatible|migration 004/i);
});

test('refuses every ambiguous migration 004 schema state without repair or success history', async (t) => {
  const ambiguousStates = [
    {
      name: 'wrong analysis column type',
      async arrange(pool) {
        await pool.query('ALTER TABLE proyectos ADD COLUMN analisis_ia VARCHAR(255) NULL AFTER estado');
      },
    },
    {
      name: 'check without its analysis column',
      async arrange(pool) {
        await pool.query(
          'ALTER TABLE proyectos ADD CONSTRAINT chk_proyectos_analisis_ia_objeto CHECK (1 = 1)',
        );
      },
    },
    {
      name: 'wrong object-check semantics',
      async arrange(pool) {
        await createAnalysisColumn(pool);
        await pool.query(`
          ALTER TABLE proyectos
            ADD CONSTRAINT chk_proyectos_analisis_ia_objeto
            CHECK (analisis_ia IS NULL OR JSON_TYPE(analisis_ia) = 'ARRAY')
        `);
      },
    },
    {
      name: 'unknown status set',
      async arrange(pool) {
        await pool.query(`
          ALTER TABLE proyectos
            DROP CHECK chk_proyectos_estado,
            ADD CONSTRAINT chk_proyectos_estado CHECK (estado IN ('nuevo', 'other'))
        `);
      },
    },
    {
      name: 'case-mismatched status',
      async arrange(pool) {
        await pool.query(`
          ALTER TABLE proyectos
            DROP CHECK chk_proyectos_estado,
            ADD CONSTRAINT chk_proyectos_estado CHECK (estado IN ('nuevo', 'Analizado'))
        `);
      },
    },
    {
      name: 'unexpected singleton status value',
      async arrange(pool) {
        await pool.query(`
          ALTER TABLE proyectos
            DROP CHECK chk_proyectos_estado,
            ADD CONSTRAINT chk_proyectos_estado CHECK (estado = 'other')
        `);
      },
    },
    {
      name: 'extra conflicting status check',
      async arrange(pool) {
        await pool.query(
          "ALTER TABLE proyectos ADD CONSTRAINT chk_proyectos_estado_extra CHECK (estado IN ('nuevo', 'analizado'))",
        );
      },
    },
    {
      name: 'non-object retained JSON',
      async arrange(pool) {
        await createAnalysisColumn(pool);
        await pool.execute("INSERT INTO proyectos (payload, estado, analisis_ia) VALUES (CAST(? AS JSON), 'nuevo', CAST(? AS JSON))", [
          JSON.stringify({ empresa: {} }),
          JSON.stringify([]),
        ]);
      },
    },
  ];

  for (const ambiguousState of ambiguousStates) {
    await t.test(`does not mutate ${ambiguousState.name}`, async (t) => {
      const pool = await preparePreAnalysisSchema(t);

      await ambiguousState.arrange(pool);
      await assert.rejects(runMigration('up'), /ambiguous|incompatible|migration 004/i);
      assert.equal(await getAnalysisHistory(pool), null);
    });
  }
});

test('protects migration 004 rollback data and reconciles only supported interrupted rollback states', async (t) => {
  const pool = await prepareMigratedSchema(t);

  await assertAnalysisTarget(pool);

  await pool.execute("INSERT INTO proyectos (payload, estado, analisis_ia) VALUES (CAST(? AS JSON), 'analizado', CAST(? AS JSON))", [
    JSON.stringify({ empresa: {} }),
    JSON.stringify(validAnalysis),
  ]);

  await runMigration('down');
  await assert.rejects(runMigration('down'), /analysis|data|rollback/i);
  await assertAnalysisTarget(pool);
  assert.equal((await getAnalysisHistory(pool))?.state, 'applied');

  await pool.query('DELETE FROM proyectos');
  await pool.execute(
    "UPDATE schema_migrations SET state = 'rolling_back' WHERE migration_name = ?",
    [analysisMigration],
  );
  await runMigration('up');

  assert.equal((await getAnalysisHistory(pool))?.state, 'applied');
  await runMigration('down');
  await runMigration('down');

  const [columns] = await pool.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos' AND COLUMN_NAME = 'analisis_ia'
  `);
  assert.deepEqual(columns, []);
  assert.equal(await getAnalysisHistory(pool), null);
});

test('resumes supported source rollback and refuses a partial rolling-back schema without discarding data', async (t) => {
  await t.test('reapplies from an exact source rolling-back state', async (t) => {
    const pool = await prepareMigratedSchema(t);

    await runMigration('down');
    await assertAnalysisTarget(pool);

    await pool.execute(
      "UPDATE schema_migrations SET state = 'rolling_back' WHERE migration_name = ?",
      [analysisMigration],
    );
    await pool.query(`
      ALTER TABLE proyectos
        DROP CHECK chk_proyectos_estado,
        ADD CONSTRAINT chk_proyectos_estado CHECK (estado IN ('nuevo')),
        DROP CHECK chk_proyectos_analisis_ia_objeto,
        DROP COLUMN analisis_ia
    `);

    await runMigration('up');

    await assertAnalysisTarget(pool);
    assert.equal((await getAnalysisHistory(pool))?.state, 'applied');
  });

  await t.test('refuses a partial rolling-back state before repair SQL or history deletion', async (t) => {
    const pool = await prepareMigratedSchema(t);

    await runMigration('down');
    await assertAnalysisTarget(pool);

    await pool.execute(
      "UPDATE schema_migrations SET state = 'rolling_back' WHERE migration_name = ?",
      [analysisMigration],
    );
    await pool.query('ALTER TABLE proyectos DROP CHECK chk_proyectos_analisis_ia_objeto');

    await assert.rejects(runMigration('down'), /partial|ambiguous|rollback/i);
    assert.equal((await getAnalysisHistory(pool))?.state, 'rolling_back');
    const [checks] = await pool.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos'
    `);
    assert.equal(
      checks.some((check) => check.CONSTRAINT_NAME === 'chk_proyectos_analisis_ia_objeto'),
      false,
    );
  });
});

test('applies, recovers, and safely rolls back the bounded migration 005 constraint evolution', async (t) => {
  const migrationsDirectory = path.join(backendDirectory, 'migrations');
  const priorMigrationFiles = ['001_create_proyectos', '002_create_historias', '003_create_equipo', analysisMigration]
    .flatMap((name) => [
      path.join(migrationsDirectory, `${name}.up.sql`),
      path.join(migrationsDirectory, `${name}.down.sql`),
    ]);
  const priorBytes = await Promise.all(priorMigrationFiles.map((file) => readFile(file)));
  const pool = await prepareMigratedSchema(t);
  const [columns] = await pool.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'historias'
    ORDER BY ORDINAL_POSITION
  `);
  const [checks] = await pool.query(`
    SELECT tc.TABLE_NAME, tc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
      ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
      AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
    WHERE tc.TABLE_SCHEMA = DATABASE()
      AND tc.CONSTRAINT_NAME IN ('chk_proyectos_estado', 'chk_historias_rol')
  `);
  const statusCheck = checks.find((check) => check.CONSTRAINT_NAME === 'chk_proyectos_estado');
  const roleCheck = checks.find((check) => check.CONSTRAINT_NAME === 'chk_historias_rol');

  assert.deepEqual(
    columns.map((column) => column.COLUMN_NAME),
    [
      'id',
      'proyecto_id',
      'prioridad',
      'historia_usuario',
      'descripcion',
      'criterios_aceptacion',
      'alcance_tecnico',
      'estimacion_fibonacci',
      'rol_sugerido',
      'fase',
      'columna_tablero',
      'fecha_inicio_estimada',
      'fecha_fin_estimada',
      'creado_en',
      'actualizado_en',
    ],
  );
  assert.equal(
    canonicalizeCheckClause(statusCheck?.CHECK_CLAUSE ?? ''),
    "estadoin'nuevo','analizado','planificado'",
  );
  assert.equal(
    canonicalizeCheckClause(roleCheck?.CHECK_CLAUSE ?? ''),
    "rol_sugeridoin'desarrolladorfrontend','desarrolladorbackend','analistaqa','analistadeciberseguridad','analistaderequerimientos','projectmanager','frontend','backend','qa','ciberseguridad'",
  );
  assert.deepEqual(await Promise.all(priorMigrationFiles.map((file) => readFile(file))), priorBytes);

  await runMigration('up');

  const [history] = await pool.execute(
    'SELECT state FROM schema_migrations WHERE migration_name = ?',
    [backlogMigration],
  );
  assert.equal(history[0]?.state, 'applied');

  await pool.execute("INSERT INTO proyectos (payload, estado) VALUES (CAST(? AS JSON), 'planificado')", [
    JSON.stringify({ empresa: {} }),
  ]);
  await assert.rejects(runMigration('down'), /planning data|rollback/i);
  assert.equal(history[0]?.state, 'applied');

  await pool.query('DELETE FROM proyectos');
  await runMigration('down');

  const [sourceStatus] = await pool.query(`
    SELECT cc.CHECK_CLAUSE
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
      ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
      AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
    WHERE tc.TABLE_SCHEMA = DATABASE()
      AND tc.TABLE_NAME = 'proyectos'
      AND tc.CONSTRAINT_NAME = 'chk_proyectos_estado'
  `);
  assert.equal(
    canonicalizeCheckClause(sourceStatus[0]?.CHECK_CLAUSE ?? ''),
    "estadoin'nuevo','analizado'",
  );

  await t.test('repairs one recognized fixed partial target state', async (t) => {
    const partialPool = await preparePreAnalysisSchema(t);

    await partialPool.query(`
      ALTER TABLE proyectos
        DROP CHECK chk_proyectos_estado,
        ADD CONSTRAINT chk_proyectos_estado CHECK (estado IN ('nuevo', 'analizado', 'planificado'))
    `);
    await runMigration('up');

    const [partialHistory] = await partialPool.execute(
      'SELECT state FROM schema_migrations WHERE migration_name = ?',
      [backlogMigration],
    );
    assert.equal(partialHistory[0]?.state, 'applied');
  });
});

test('uses only the fixed Node child-process invocation and refuses unknown migration commands before mutation', async (t) => {
  const pool = createTestPool();

  t.after(async () => {
    await closeMigrationTestPool(pool);
  });

  await resetMigrationTestState(pool);
  await assert.rejects(runMigration('status'), /exactly up or down/);
  await assertNoMigrationMutation(pool);
  await assert.rejects(runMigration('up --sql=DROP TABLE proyectos'), /exactly up or down/);
  await assertNoMigrationMutation(pool);
});
