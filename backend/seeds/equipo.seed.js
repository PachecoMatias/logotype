export const TEAM_ROSTER = [
  { rol: 'Desarrollador Frontend', perfil: 'Alto rendimiento', cantidad: 3 },
  { rol: 'Desarrollador Backend', perfil: 'Alto rendimiento', cantidad: 3 },
  { rol: 'Analista QA', perfil: 'Alto rendimiento', cantidad: 2 },
  { rol: 'Analista de Ciberseguridad', perfil: 'Alto rendimiento', cantidad: 1 },
  { rol: 'Analista de requerimientos', perfil: 'Administrativo', cantidad: 2 },
  { rol: 'Project Manager', perfil: 'Administrativo', cantidad: 1 },
];

const upsertStatement = `
  INSERT INTO equipo (rol, perfil, cantidad)
  VALUES (?, ?, ?)
  ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)
`;

export async function seedEquipo(connection, roster = TEAM_ROSTER) {
  try {
    await connection.beginTransaction();

    for (const { rol, perfil, cantidad } of roster) {
      await connection.execute(upsertStatement, [rol, perfil, cantidad]);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}
