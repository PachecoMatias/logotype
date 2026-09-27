import { getPool, withTransaction } from '../config/database.js';
import { projectBacklogStorySchema } from '../schemas/project-backlog.schema.js';

const storyColumns = `
  fase, prioridad, historia_usuario, descripcion, criterios_aceptacion,
  alcance_tecnico, estimacion_fibonacci, rol_sugerido
`;

function parseCriteria(value) {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function mapStory(row) {
  const result = projectBacklogStorySchema.safeParse({
    fase: row.fase,
    prioridad: row.prioridad,
    historia_usuario: row.historia_usuario,
    descripcion: row.descripcion,
    criterios_aceptacion: parseCriteria(row.criterios_aceptacion),
    alcance_tecnico: row.alcance_tecnico,
    estimacion_fibonacci: row.estimacion_fibonacci,
    rol_sugerido: row.rol_sugerido,
  });

  if (!result.success) {
    throw new Error('Stored project backlog violates the persistence invariant');
  }

  return result.data;
}

async function findByProjectIdWithConnection(connection, projectId) {
  const [rows] = await connection.execute(
    `
      SELECT ${storyColumns}
      FROM historias
      WHERE proyecto_id = ?
      ORDER BY id ASC
    `,
    [projectId],
  );

  return rows.map(mapStory);
}

async function findByProjectId(configuration, projectId) {
  return findByProjectIdWithConnection(getPool(configuration), projectId);
}

async function persistGeneratedBacklog(configuration, projectId, stories) {
  return withTransaction(configuration, async (connection) => {
    const [projects] = await connection.execute(
      'SELECT estado FROM proyectos WHERE id = ? FOR UPDATE',
      [projectId],
    );

    if (!projects[0]) {
      throw new Error('Locked project disappeared during backlog persistence');
    }

    const existingStories = await findByProjectIdWithConnection(connection, projectId);

    if (existingStories.length > 0) {
      return { outcome: 'existing', stories: existingStories };
    }

    if (projects[0].estado !== 'analizado') {
      return { outcome: 'ineligible' };
    }

    const placeholders = stories
      .map(() => "(?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?)")
      .join(', ');
    const values = stories.flatMap((story) => [
      projectId,
      story.prioridad,
      story.historia_usuario,
      story.descripcion,
      JSON.stringify(story.criterios_aceptacion),
      story.alcance_tecnico,
      story.estimacion_fibonacci,
      story.rol_sugerido,
      story.fase,
    ]);

    await connection.execute(
      `
        INSERT INTO historias (
          proyecto_id, prioridad, historia_usuario, descripcion, criterios_aceptacion,
          alcance_tecnico, estimacion_fibonacci, rol_sugerido, fase
        ) VALUES ${placeholders}
      `,
      values,
    );

    const [update] = await connection.execute(
      "UPDATE proyectos SET estado = 'planificado' WHERE id = ? AND estado = 'analizado'",
      [projectId],
    );

    if (update.affectedRows !== 1) {
      throw new Error('Project state transition failed during backlog persistence');
    }

    const storedStories = await findByProjectIdWithConnection(connection, projectId);

    if (storedStories.length !== stories.length) {
      throw new Error('Stored project backlog count violates the persistence invariant');
    }

    return { outcome: 'committed', stories: storedStories };
  });
}

export const historiasRepository = { findByProjectId, persistGeneratedBacklog };
