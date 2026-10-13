import { getPool, withTransaction } from '../config/database.js';
import { storedProjectAnalysisSchema } from '../schemas/project-analysis.schema.js';

function parsePayload(payload) {
  return typeof payload === 'string' ? JSON.parse(payload) : payload;
}

function parseStoredAnalysis(analysis) {
  if (analysis === null) {
    return null;
  }

  try {
    const parsedAnalysis = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
    const result = storedProjectAnalysisSchema.safeParse(parsedAnalysis);

    if (!result.success) {
      throw new Error('Stored project analysis violates the persistence invariant');
    }

    return result.data;
  } catch {
    throw new Error('Stored project analysis violates the persistence invariant');
  }
}

function toIsoTimestamp(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapProject(row) {
  return {
    id: row.id,
    estado: row.estado,
    payload: parsePayload(row.payload),
    analisisIa: parseStoredAnalysis(row.analisis_ia),
    decisionViabilidad: row.decision_viabilidad,
    decisionMotivo: row.decision_motivo,
    decisionFecha: row.decision_fecha === null ? null : toIsoTimestamp(row.decision_fecha),
    creadoEn: toIsoTimestamp(row.creado_en),
    actualizadoEn: toIsoTimestamp(row.actualizado_en),
  };
}

async function insert(configuration, payload) {
  const [result] = await getPool(configuration).execute(
    "INSERT INTO proyectos (payload, estado) VALUES (CAST(? AS JSON), 'nuevo')",
    [JSON.stringify(payload)],
  );

  return findById(configuration, result.insertId);
}

async function findAll(configuration) {
  const [rows] = await getPool(configuration).query(`
    SELECT id, payload, estado, analisis_ia, decision_viabilidad, decision_motivo,
           decision_fecha, creado_en, actualizado_en
    FROM proyectos
    ORDER BY id ASC
  `);

  return rows.map(mapProject);
}

async function findById(configuration, id) {
  const [rows] = await getPool(configuration).execute(
    `
      SELECT id, payload, estado, analisis_ia, decision_viabilidad, decision_motivo,
             decision_fecha, creado_en, actualizado_en
      FROM proyectos
      WHERE id = ?
    `,
    [id],
  );

  return rows[0] ? mapProject(rows[0]) : null;
}

async function storeAnalysisIfPending(configuration, id, analysis) {
  const [result] = await getPool(configuration).execute(
    `
      UPDATE proyectos
      SET analisis_ia = CAST(? AS JSON), estado = 'analizado'
       WHERE id = ?
         AND estado IN ('nuevo', 'analizado')
         AND (
           analisis_ia IS NULL
           OR JSON_EXTRACT(analisis_ia, '$.version') IS NULL
         )
         AND NOT EXISTS (
           SELECT 1 FROM historias WHERE historias.proyecto_id = proyectos.id
         )
         AND decision_viabilidad IS NULL
    `,
    [JSON.stringify(analysis), id],
  );

  return { updated: result.affectedRows === 1 };
}

async function storeViabilityDecision(configuration, id, decision, reason) {
  return withTransaction(configuration, async (connection) => {
    const [projects] = await connection.execute(
      `
        SELECT id, payload, estado, analisis_ia, decision_viabilidad, decision_motivo,
               decision_fecha, creado_en, actualizado_en
        FROM proyectos
        WHERE id = ?
        FOR UPDATE
      `,
      [id],
    );
    if (!projects[0]) return { outcome: 'missing' };

    const analysis = parseStoredAnalysis(projects[0].analisis_ia);
    if (analysis?.version !== 2) return { outcome: 'analysis_required' };

    const [stories] = await connection.execute(
      'SELECT 1 FROM historias WHERE proyecto_id = ? LIMIT 1',
      [id],
    );
    if (stories.length > 0) return { outcome: 'backlog_exists' };

    await connection.execute(
      `
        UPDATE proyectos
        SET decision_viabilidad = ?, decision_motivo = ?, decision_fecha = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [decision, reason, id],
    );
    const [updated] = await connection.execute(
      `
        SELECT id, payload, estado, analisis_ia, decision_viabilidad, decision_motivo,
               decision_fecha, creado_en, actualizado_en
        FROM proyectos
        WHERE id = ?
      `,
      [id],
    );
    return { outcome: 'updated', project: mapProject(updated[0]) };
  });
}

export const proyectosRepository = {
  findAll,
  findById,
  insert,
  storeAnalysisIfPending,
  storeViabilityDecision,
};
