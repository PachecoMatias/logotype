import { getPool } from '../config/database.js';

function parsePayload(payload) {
  return typeof payload === 'string' ? JSON.parse(payload) : payload;
}

function toIsoTimestamp(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapProject(row) {
  return {
    id: row.id,
    estado: row.estado,
    payload: parsePayload(row.payload),
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
    SELECT id, payload, estado, creado_en, actualizado_en
    FROM proyectos
    ORDER BY id ASC
  `);

  return rows.map(mapProject);
}

async function findById(configuration, id) {
  const [rows] = await getPool(configuration).execute(
    `
      SELECT id, payload, estado, creado_en, actualizado_en
      FROM proyectos
      WHERE id = ?
    `,
    [id],
  );

  return rows[0] ? mapProject(rows[0]) : null;
}

export const proyectosRepository = { findAll, findById, insert };
