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
  { name: '004_add_project_ai_analysis', table: 'proyectos', kind: 'project-analysis-alter' },
  { name: '005_enable_backlog_planning', table: 'proyectos', kind: 'backlog-planning-alter' },
];

const projectAnalysisMigrationKind = 'project-analysis-alter';
const backlogPlanningMigrationKind = 'backlog-planning-alter';
const projectAnalysisColumnName = 'analisis_ia';
const projectStatusCheckName = 'chk_proyectos_estado';
const projectAnalysisCheckName = 'chk_proyectos_analisis_ia_objeto';
const projectPayloadCheckName = 'chk_proyectos_payload_objeto';
const sourceStatusCheckClause = "estado IN ('nuevo')";
const sourceStatusEqualityCheckClause = "estado = 'nuevo'";
const targetStatusCheckClause = "estado IN ('nuevo', 'analizado')";
const backlogTargetStatusCheckClause = "estado IN ('nuevo', 'analizado', 'planificado')";
const sourceRoleCheckClause = `rol_sugerido IN (
  'Desarrollador Frontend', 'Desarrollador Backend', 'Analista QA',
  'Analista de Ciberseguridad', 'Analista de requerimientos', 'Project Manager'
)`;
const targetRoleCheckClause = `rol_sugerido IN (
  'Desarrollador Frontend', 'Desarrollador Backend', 'Analista QA',
  'Analista de Ciberseguridad', 'Analista de requerimientos', 'Project Manager',
  'Frontend', 'Backend', 'QA', 'Ciberseguridad'
)`;
const storyRoleCheckName = 'chk_historias_rol';
const analysisObjectCheckClause = "analisis_ia IS NULL OR JSON_TYPE(analisis_ia) = 'OBJECT'";
const addAnalysisColumnClause = 'ADD COLUMN analisis_ia JSON NULL AFTER estado';
const addAnalysisObjectCheckClause = `ADD CONSTRAINT ${projectAnalysisCheckName}
  CHECK (${analysisObjectCheckClause})`;
const replaceStatusWithTargetClause = `DROP CHECK ${projectStatusCheckName},
  ADD CONSTRAINT ${projectStatusCheckName} CHECK (${targetStatusCheckClause})`;
const replaceStatusWithBacklogTargetClause = `DROP CHECK ${projectStatusCheckName},
  ADD CONSTRAINT ${projectStatusCheckName} CHECK (${backlogTargetStatusCheckClause})`;
const replaceRoleWithBacklogTargetClause = `DROP CHECK ${storyRoleCheckName},
  ADD CONSTRAINT ${storyRoleCheckName} CHECK (${targetRoleCheckClause})`;
const replaceRoleWithSourceClause = `DROP CHECK ${storyRoleCheckName},
  ADD CONSTRAINT ${storyRoleCheckName} CHECK (${sourceRoleCheckClause})`;
const replaceStatusWithSourceClause = `DROP CHECK ${projectStatusCheckName},
  ADD CONSTRAINT ${projectStatusCheckName} CHECK (${targetStatusCheckClause})`;

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

function isProjectAnalysisMigration(definition) {
  return definition.kind === projectAnalysisMigrationKind;
}

function isBacklogPlanningMigration(definition) {
  return definition.kind === backlogPlanningMigrationKind;
}

function isSpecialMigration(definition) {
  return isProjectAnalysisMigration(definition) || isBacklogPlanningMigration(definition);
}

function canonicalizeCheckClause(clause) {
  const normalized = clause
    .replaceAll('`', '')
    .replace(/_utf8mb4(?:_[A-Za-z0-9]+)*(?=\\?')/gi, '')
    .replaceAll('\\', '')
    .replace(/[()\s]/g, '');

  return normalized
    .split("'")
    .map((segment, index) => (index % 2 === 0 ? segment.toLowerCase() : segment))
    .join("'");
}

function matchesCheckClause(actualClause, expectedClause) {
  const canonicalActualClause = canonicalizeCheckClause(actualClause);
  const canonicalExpectedClause = canonicalizeCheckClause(expectedClause);

  if (canonicalExpectedClause === canonicalizeCheckClause(sourceStatusCheckClause)) {
    return [sourceStatusCheckClause, sourceStatusEqualityCheckClause].some(
      (supportedClause) => canonicalActualClause === canonicalizeCheckClause(supportedClause),
    );
  }

  return canonicalActualClause === canonicalExpectedClause;
}

function isExpectedStatusColumn(column) {
  return (
    column?.COLUMN_TYPE === 'varchar(32)' &&
    column.IS_NULLABLE === 'NO' &&
    column.COLUMN_DEFAULT === 'nuevo' &&
    column.COLLATION_NAME === 'utf8mb4_0900_as_cs'
  );
}

function isExpectedAnalysisColumn(column) {
  return column?.COLUMN_TYPE === 'json' && column.IS_NULLABLE === 'YES';
}

async function inspectProjectAnalysisState(connection) {
  const [columns] = await connection.query(`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLLATION_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos'
  `);
  const [checks] = await connection.query(`
    SELECT tc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
      ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
      AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
    WHERE tc.TABLE_SCHEMA = DATABASE()
      AND tc.TABLE_NAME = 'proyectos'
      AND tc.CONSTRAINT_TYPE = 'CHECK'
  `);
  const columnsByName = new Map(columns.map((column) => [column.COLUMN_NAME, column]));
  const checksByName = new Map(checks.map((check) => [check.CONSTRAINT_NAME, check]));
  const analysisColumn = columnsByName.get(projectAnalysisColumnName);
  const analysisCheck = checksByName.get(projectAnalysisCheckName);
  const statusCheck = checksByName.get(projectStatusCheckName);
  const allowedCheckNames = new Set([
    projectPayloadCheckName,
    projectStatusCheckName,
    projectAnalysisCheckName,
  ]);
  const unexpectedChecks = checks.filter((check) => !allowedCheckNames.has(check.CONSTRAINT_NAME));

  let nonObjectAnalysisCount = 0;
  if (isExpectedAnalysisColumn(analysisColumn)) {
    const [rows] = await connection.query(`
      SELECT COUNT(*) AS non_object_count
      FROM proyectos
      WHERE analisis_ia IS NOT NULL AND JSON_TYPE(analisis_ia) <> 'OBJECT'
    `);
    nonObjectAnalysisCount = rows[0]?.non_object_count ?? 0;
  }

  if (!isExpectedStatusColumn(columnsByName.get('estado'))) {
    return { kind: 'ambiguous', reason: 'Project status column is incompatible' };
  }

  if (unexpectedChecks.length > 0) {
    return { kind: 'ambiguous', reason: 'Project schema contains unexpected check constraints' };
  }

  const columnState = analysisColumn
    ? isExpectedAnalysisColumn(analysisColumn)
      ? 'exact'
      : 'incompatible'
    : 'absent';
  const analysisCheckState = analysisCheck
    ? matchesCheckClause(analysisCheck.CHECK_CLAUSE, analysisObjectCheckClause)
      ? 'exact'
      : 'incompatible'
    : 'absent';
  const statusCheckState = statusCheck
    ? matchesCheckClause(statusCheck.CHECK_CLAUSE, sourceStatusCheckClause)
      ? 'source'
      : matchesCheckClause(statusCheck.CHECK_CLAUSE, targetStatusCheckClause) ||
          matchesCheckClause(statusCheck.CHECK_CLAUSE, backlogTargetStatusCheckClause)
        ? 'target'
        : 'incompatible'
    : 'absent';

  if (
    columnState === 'incompatible' ||
    analysisCheckState === 'incompatible' ||
    statusCheckState === 'incompatible' ||
    statusCheckState === 'absent' ||
    nonObjectAnalysisCount > 0
  ) {
    return { kind: 'ambiguous', reason: 'Project analysis schema is ambiguous or incompatible' };
  }

  if (
    columnState === 'absent' &&
    analysisCheckState === 'absent' &&
    statusCheckState === 'source'
  ) {
    return { kind: 'source' };
  }

  if (
    columnState === 'exact' &&
    analysisCheckState === 'exact' &&
    statusCheckState === 'target'
  ) {
    return { kind: 'target' };
  }

  if (
    (columnState === 'exact' && analysisCheckState === 'absent') ||
    (columnState === 'exact' && analysisCheckState === 'exact' && statusCheckState === 'source') ||
    (columnState === 'absent' && analysisCheckState === 'absent' && statusCheckState === 'target')
  ) {
    return { kind: 'partial', columnState, analysisCheckState, statusCheckState };
  }

  return { kind: 'ambiguous', reason: 'Project analysis schema is ambiguous or incompatible' };
}

async function verifyProjectAnalysisState(connection, expectedKind) {
  const inspection = await inspectProjectAnalysisState(connection);

  if (inspection.kind !== expectedKind) {
    throw new Error(`Migration 004 verification failed: expected ${expectedKind} schema state`);
  }

  return inspection;
}

async function insertApplyingHistory(connection, definition) {
  await connection.execute(
    `
      INSERT INTO schema_migrations (migration_name, checksum, state, applied_at)
      VALUES (?, ?, 'applying', NULL)
    `,
    [definition.name, definition.checksum],
  );
}

async function markProjectAnalysisApplied(connection, definition) {
  await verifyProjectAnalysisState(connection, 'target');
  await connection.execute(
    `
      UPDATE schema_migrations
      SET state = 'applied', applied_at = CURRENT_TIMESTAMP(6)
      WHERE migration_name = ?
    `,
    [definition.name],
  );
}

async function insertVerifiedProjectAnalysisHistory(connection, definition) {
  await verifyProjectAnalysisState(connection, 'target');
  await connection.execute(
    `
      INSERT INTO schema_migrations (migration_name, checksum, state, applied_at)
      VALUES (?, ?, 'applied', CURRENT_TIMESTAMP(6))
    `,
    [definition.name, definition.checksum],
  );
}

async function repairProjectAnalysisState(connection, inspection) {
  const clauses = [];

  if (inspection.columnState === 'absent') {
    clauses.push(addAnalysisColumnClause);
  }

  if (inspection.analysisCheckState === 'absent') {
    clauses.push(addAnalysisObjectCheckClause);
  }

  if (inspection.statusCheckState === 'source') {
    clauses.push(replaceStatusWithTargetClause);
  }

  if (clauses.length === 0) {
    throw new Error('Migration 004 recovery has no deterministic repair clauses');
  }

  await connection.query(`ALTER TABLE proyectos\n  ${clauses.join(',\n  ')}`);
}

async function applyProjectAnalysisMigration(connection, definition, history) {
  let record = history.get(definition.name);
  let inspection = await inspectProjectAnalysisState(connection);

  if (record?.state === 'applied') {
    await verifyProjectAnalysisState(connection, 'target');
    return;
  }

  if (record?.state === 'rolling_back') {
    if (inspection.kind === 'source') {
      await connection.execute('DELETE FROM schema_migrations WHERE migration_name = ?', [
        definition.name,
      ]);
      history.delete(definition.name);
      record = undefined;
    } else if (inspection.kind === 'target') {
      await markProjectAnalysisApplied(connection, definition);
      history.set(definition.name, { ...record, state: 'applied' });
      return;
    } else {
      throw new Error('Migration 004 rollback is partial or ambiguous');
    }
  }

  if (record?.state === 'applying') {
    if (inspection.kind === 'target') {
      await markProjectAnalysisApplied(connection, definition);
      history.set(definition.name, { ...record, state: 'applied' });
      return;
    }

    if (inspection.kind === 'source') {
      await connection.query(definition.upSql);
    } else if (inspection.kind === 'partial') {
      await repairProjectAnalysisState(connection, inspection);
    } else {
      throw new Error(`Migration 004 cannot recover: ${inspection.reason}`);
    }

    await markProjectAnalysisApplied(connection, definition);
    history.set(definition.name, { ...record, state: 'applied' });
    return;
  }

  if (inspection.kind === 'target') {
    await insertVerifiedProjectAnalysisHistory(connection, definition);
    history.set(definition.name, { name: definition.name, state: 'applied' });
    return;
  }

  if (inspection.kind !== 'source' && inspection.kind !== 'partial') {
    throw new Error(`Migration 004 cannot recover: ${inspection.reason}`);
  }

  await insertApplyingHistory(connection, definition);
  history.set(definition.name, { name: definition.name, state: 'applying' });

  if (inspection.kind === 'source') {
    await connection.query(definition.upSql);
  } else {
    await repairProjectAnalysisState(connection, inspection);
  }

  await markProjectAnalysisApplied(connection, definition);
  history.set(definition.name, { name: definition.name, state: 'applied' });
}

async function findCheckClause(connection, tableName, checkName) {
  const [rows] = await connection.execute(
    `
      SELECT cc.CHECK_CLAUSE
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
        ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
        AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
      WHERE tc.TABLE_SCHEMA = DATABASE()
        AND tc.TABLE_NAME = ?
        AND tc.CONSTRAINT_NAME = ?
        AND tc.CONSTRAINT_TYPE = 'CHECK'
    `,
    [tableName, checkName],
  );

  return rows[0]?.CHECK_CLAUSE;
}

function classifyBacklogCheck(actualClause, sourceClause, targetClause) {
  if (typeof actualClause !== 'string') {
    return 'incompatible';
  }

  if (matchesCheckClause(actualClause, targetClause)) {
    return 'target';
  }

  if (matchesCheckClause(actualClause, sourceClause)) {
    return 'source';
  }

  return 'incompatible';
}

async function inspectBacklogPlanningState(connection) {
  const [statusClause, roleClause] = await Promise.all([
    findCheckClause(connection, 'proyectos', projectStatusCheckName),
    findCheckClause(connection, 'historias', storyRoleCheckName),
  ]);
  const statusCheckState = classifyBacklogCheck(
    statusClause,
    targetStatusCheckClause,
    backlogTargetStatusCheckClause,
  );
  const roleCheckState = classifyBacklogCheck(
    roleClause,
    sourceRoleCheckClause,
    targetRoleCheckClause,
  );

  if (statusCheckState === 'incompatible' || roleCheckState === 'incompatible') {
    return { kind: 'ambiguous', reason: 'Backlog planning constraints are incompatible' };
  }

  if (statusCheckState === 'target' && roleCheckState === 'target') {
    return { kind: 'target', statusCheckState, roleCheckState };
  }

  if (statusCheckState === 'source' && roleCheckState === 'source') {
    return { kind: 'source', statusCheckState, roleCheckState };
  }

  return { kind: 'partial', statusCheckState, roleCheckState };
}

async function verifyBacklogPlanningState(connection, expectedKind) {
  const inspection = await inspectBacklogPlanningState(connection);

  if (inspection.kind !== expectedKind) {
    throw new Error(`Migration 005 verification failed: expected ${expectedKind} schema state`);
  }

  return inspection;
}

async function markBacklogPlanningApplied(connection, definition) {
  await verifyBacklogPlanningState(connection, 'target');
  await connection.execute(
    `
      UPDATE schema_migrations
      SET state = 'applied', applied_at = CURRENT_TIMESTAMP(6)
      WHERE migration_name = ?
    `,
    [definition.name],
  );
}

async function insertVerifiedBacklogPlanningHistory(connection, definition) {
  await verifyBacklogPlanningState(connection, 'target');
  await connection.execute(
    `
      INSERT INTO schema_migrations (migration_name, checksum, state, applied_at)
      VALUES (?, ?, 'applied', CURRENT_TIMESTAMP(6))
    `,
    [definition.name, definition.checksum],
  );
}

async function repairBacklogPlanningTarget(connection, inspection) {
  const operations = [];

  if (inspection.statusCheckState === 'source') {
    operations.push(`ALTER TABLE proyectos\n  ${replaceStatusWithBacklogTargetClause}`);
  }

  if (inspection.roleCheckState === 'source') {
    operations.push(`ALTER TABLE historias\n  ${replaceRoleWithBacklogTargetClause}`);
  }

  if (operations.length === 0) {
    throw new Error('Migration 005 recovery has no deterministic repair clauses');
  }

  for (const operation of operations) {
    await connection.query(operation);
  }
}

async function applyBacklogPlanningMigration(connection, definition, history) {
  let record = history.get(definition.name);
  let inspection = await inspectBacklogPlanningState(connection);

  if (record?.state === 'applied') {
    await verifyBacklogPlanningState(connection, 'target');
    return;
  }

  if (record?.state === 'rolling_back') {
    if (inspection.kind === 'source') {
      await connection.execute('DELETE FROM schema_migrations WHERE migration_name = ?', [
        definition.name,
      ]);
      history.delete(definition.name);
      record = undefined;
    } else if (inspection.kind === 'target') {
      await markBacklogPlanningApplied(connection, definition);
      history.set(definition.name, { ...record, state: 'applied' });
      return;
    } else {
      throw new Error('Migration 005 rollback is partial or ambiguous');
    }
  }

  if (record?.state === 'applying') {
    if (inspection.kind === 'target') {
      await markBacklogPlanningApplied(connection, definition);
      history.set(definition.name, { ...record, state: 'applied' });
      return;
    }

    if (inspection.kind === 'source' || inspection.kind === 'partial') {
      await repairBacklogPlanningTarget(connection, inspection);
    } else {
      throw new Error(`Migration 005 cannot recover: ${inspection.reason}`);
    }

    await markBacklogPlanningApplied(connection, definition);
    history.set(definition.name, { ...record, state: 'applied' });
    return;
  }

  if (inspection.kind === 'target') {
    await insertVerifiedBacklogPlanningHistory(connection, definition);
    history.set(definition.name, { name: definition.name, state: 'applied' });
    return;
  }

  if (inspection.kind !== 'source' && inspection.kind !== 'partial') {
    throw new Error(`Migration 005 cannot recover: ${inspection.reason}`);
  }

  await insertApplyingHistory(connection, definition);
  history.set(definition.name, { name: definition.name, state: 'applying' });
  await repairBacklogPlanningTarget(connection, inspection);
  await markBacklogPlanningApplied(connection, definition);
  history.set(definition.name, { name: definition.name, state: 'applied' });
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
  const standardDefinitions = definitions.filter(
    (definition) => !isSpecialMigration(definition),
  );
  const standardRows = rows.filter(
    (row) => !isSpecialMigration(definitionsByName.get(row.migration_name)),
  );
  const history = await reconcileHistory(connection, standardRows, new Map(
    standardDefinitions.map((definition) => [definition.name, definition]),
  ));

  for (const row of rows) {
    if (isSpecialMigration(definitionsByName.get(row.migration_name))) {
      history.set(row.migration_name, row);
    }
  }

  return history;
}

async function applyPendingMigrations(connection, definitions, history) {
  for (const definition of definitions) {
    if (isProjectAnalysisMigration(definition)) {
      await applyProjectAnalysisMigration(connection, definition, history);
      continue;
    }

    if (isBacklogPlanningMigration(definition)) {
      await applyBacklogPlanningMigration(connection, definition, history);
      continue;
    }

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

async function rollbackProjectAnalysisMigration(connection, definition, history) {
  const record = history.get(definition.name);
  const inspection = await inspectProjectAnalysisState(connection);

  if (!record) {
    if (inspection.kind === 'source') {
      return false;
    }

    if (inspection.kind === 'target') {
      await insertVerifiedProjectAnalysisHistory(connection, definition);
      history.set(definition.name, { name: definition.name, state: 'applied' });
    } else {
      throw new Error(`Migration 004 cannot roll back: ${inspection.reason ?? 'partial schema state'}`);
    }
  } else if (record.state === 'rolling_back') {
    if (inspection.kind === 'source') {
      await connection.execute('DELETE FROM schema_migrations WHERE migration_name = ?', [
        definition.name,
      ]);
      history.delete(definition.name);
      return true;
    }

    if (inspection.kind !== 'target') {
      throw new Error('Migration 004 rollback is partial or ambiguous');
    }
  } else if (record.state === 'applying') {
    throw new Error('Migration 004 is applying and must be recovered with an up command first');
  } else if (record.state !== 'applied') {
    throw new Error('Migration 004 history contains an invalid state');
  }

  await verifyProjectAnalysisState(connection, 'target');
  const [rows] = await connection.query(`
    SELECT COUNT(*) AS blocking_count
    FROM proyectos
    WHERE estado <> 'nuevo' OR analisis_ia IS NOT NULL
  `);

  if ((rows[0]?.blocking_count ?? 0) > 0) {
    throw new Error('Migration 004 rollback is blocked by retained analysis data');
  }

  if (history.get(definition.name)?.state !== 'rolling_back') {
    await connection.execute(
      "UPDATE schema_migrations SET state = 'rolling_back' WHERE migration_name = ?",
      [definition.name],
    );
    history.set(definition.name, { ...history.get(definition.name), state: 'rolling_back' });
  }

  await connection.query(definition.downSql);
  await verifyProjectAnalysisState(connection, 'source');
  await connection.execute('DELETE FROM schema_migrations WHERE migration_name = ?', [definition.name]);
  history.delete(definition.name);

  return true;
}

async function assertBacklogRollbackSafe(connection) {
  const [plannedProjects, generatedRoles] = await Promise.all([
    connection.query("SELECT COUNT(*) AS blocking_count FROM proyectos WHERE estado = 'planificado'"),
    connection.query(`
      SELECT COUNT(*) AS blocking_count
      FROM historias
      WHERE rol_sugerido IN ('Frontend', 'Backend', 'QA', 'Ciberseguridad')
    `),
  ]);

  if (
    (plannedProjects[0][0]?.blocking_count ?? 0) > 0 ||
    (generatedRoles[0][0]?.blocking_count ?? 0) > 0
  ) {
    throw new Error('Migration 005 rollback is blocked by retained planning data');
  }
}

async function restoreBacklogPlanningSource(connection, inspection) {
  const operations = [];

  if (inspection.roleCheckState === 'target') {
    operations.push(`ALTER TABLE historias\n  ${replaceRoleWithSourceClause}`);
  }

  if (inspection.statusCheckState === 'target') {
    operations.push(`ALTER TABLE proyectos\n  ${replaceStatusWithSourceClause}`);
  }

  if (operations.length === 0) {
    throw new Error('Migration 005 rollback has no deterministic restoration clauses');
  }

  for (const operation of operations) {
    await connection.query(operation);
  }
}

async function rollbackBacklogPlanningMigration(connection, definition, history) {
  const record = history.get(definition.name);
  const inspection = await inspectBacklogPlanningState(connection);

  if (!record) {
    if (inspection.kind === 'source') {
      return false;
    }

    if (inspection.kind === 'target') {
      await insertVerifiedBacklogPlanningHistory(connection, definition);
      history.set(definition.name, { name: definition.name, state: 'applied' });
    } else {
      throw new Error(`Migration 005 cannot roll back: ${inspection.reason ?? 'partial schema state'}`);
    }
  } else if (record.state === 'rolling_back') {
    if (inspection.kind === 'source') {
      await connection.execute('DELETE FROM schema_migrations WHERE migration_name = ?', [
        definition.name,
      ]);
      history.delete(definition.name);
      return true;
    }

    if (inspection.kind !== 'target' && inspection.kind !== 'partial') {
      throw new Error('Migration 005 rollback is partial or ambiguous');
    }
  } else if (record.state === 'applying') {
    throw new Error('Migration 005 is applying and must be recovered with an up command first');
  } else if (record.state !== 'applied') {
    throw new Error('Migration 005 history contains an invalid state');
  }

  await assertBacklogRollbackSafe(connection);

  if (history.get(definition.name)?.state !== 'rolling_back') {
    await connection.execute(
      "UPDATE schema_migrations SET state = 'rolling_back' WHERE migration_name = ?",
      [definition.name],
    );
    history.set(definition.name, { ...history.get(definition.name), state: 'rolling_back' });
  }

  await restoreBacklogPlanningSource(connection, inspection);
  await verifyBacklogPlanningState(connection, 'source');
  await connection.execute('DELETE FROM schema_migrations WHERE migration_name = ?', [definition.name]);
  history.delete(definition.name);

  return true;
}

async function rollbackLatestMigration(connection, definitions, history) {
  const backlogPlanningDefinition = definitions.find(isBacklogPlanningMigration);
  const projectAnalysisDefinition = definitions.find(isProjectAnalysisMigration);

  if (backlogPlanningDefinition && !history.has(backlogPlanningDefinition.name)) {
    const backlogTablesExist =
      (await tableExists(connection, 'proyectos')) && (await tableExists(connection, 'historias'));

    if (backlogTablesExist) {
      const inspection = await inspectBacklogPlanningState(connection);

      if (inspection.kind === 'target') {
        await insertVerifiedBacklogPlanningHistory(connection, backlogPlanningDefinition);
        history.set(backlogPlanningDefinition.name, {
          name: backlogPlanningDefinition.name,
          state: 'applied',
        });
      } else if (inspection.kind !== 'source') {
        throw new Error(
          `Migration 005 cannot roll back: ${inspection.reason ?? 'partial schema state'}`,
        );
      }
    }
  }

  if (projectAnalysisDefinition && !history.has(projectAnalysisDefinition.name)) {
    const projectsExist = await tableExists(connection, projectAnalysisDefinition.table);

    if (projectsExist) {
      const inspection = await inspectProjectAnalysisState(connection);

      if (inspection.kind === 'target') {
        await insertVerifiedProjectAnalysisHistory(connection, projectAnalysisDefinition);
        history.set(projectAnalysisDefinition.name, {
          name: projectAnalysisDefinition.name,
          state: 'applied',
        });
      } else if (inspection.kind !== 'source') {
        throw new Error(
          `Migration 004 cannot roll back: ${inspection.reason ?? 'partial schema state'}`,
        );
      }
    }
  }

  const latestApplied = [...definitions]
    .reverse()
    .find((definition) => history.has(definition.name));

  if (!latestApplied) {
    return;
  }

  if (isProjectAnalysisMigration(latestApplied)) {
    await rollbackProjectAnalysisMigration(connection, latestApplied, history);
    return;
  }

  if (isBacklogPlanningMigration(latestApplied)) {
    await rollbackBacklogPlanningMigration(connection, latestApplied, history);
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
