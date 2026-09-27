import { getPool } from '../config/database.js';
import { projectAnalysisSchema } from '../schemas/project-analysis.schema.js';

function parsePayload(payload) {
  return typeof payload === 'string' ? JSON.parse(payload) : payload;
}

function parseStoredAnalysis(analysis) {
  if (analysis === null) {
    return null;
  }

  try {
    const parsedAnalysis = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
    const result = projectAnalysisSchema.safeParse(parsedAnalysis);

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
    SELECT id, payload, estado, analisis_ia, creado_en, actualizado_en
    FROM proyectos
    ORDER BY id ASC
  `);

  return rows.map(mapProject);
}

async function findById(configuration, id) {
  const [rows] = await getPool(configuration).execute(
    `
      SELECT id, payload, estado, analisis_ia, creado_en, actualizado_en
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
      WHERE id = ? AND estado = 'nuevo' AND analisis_ia IS NULL
    `,
    [JSON.stringify(analysis), id],
  );

  return { updated: result.affectedRows === 1 };
}

export const proyectosRepository = { findAll, findById, insert, storeAnalysisIfPending };
