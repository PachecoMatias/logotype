import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { app } from '../../src/app.js';
import { closePool } from '../../src/config/database.js';
import {
  closeMigrationTestPool,
  createTestPool,
  resetMigrationTestState,
  runMigration,
} from '../helpers/test-database.js';
import { createValidProjectPayload } from '../fixtures/proyecto-payload.js';

let pool;

const validStory = {
  fase: 'Desarrollo Backend',
  prioridad: 'Alta',
  historia_usuario: 'As a planner, I need an editable story.',
  descripcion: 'Deliver an editable persisted story.',
  criterios_aceptacion: ['The persisted story can be edited.'],
  alcance_tecnico: 'Implement the story editing API.',
  estimacion_fibonacci: 3,
  rol_sugerido: 'Backend',
};

async function insertStory() {
  const projectResponse = await request(app)
    .post('/api/proyectos')
    .send(createValidProjectPayload())
    .expect(201);
  const projectId = projectResponse.body.data.id;
  const [result] = await pool.execute(
    `
      INSERT INTO historias (
        proyecto_id, prioridad, historia_usuario, descripcion, criterios_aceptacion,
        alcance_tecnico, estimacion_fibonacci, rol_sugerido, fase
      ) VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?)
    `,
    [
      projectId,
      validStory.prioridad,
      validStory.historia_usuario,
      validStory.descripcion,
      JSON.stringify(validStory.criterios_aceptacion),
      validStory.alcance_tecnico,
      validStory.estimacion_fibonacci,
      validStory.rol_sugerido,
      validStory.fase,
    ],
  );

  return { id: result.insertId, projectId };
}

test.before(async () => {
  pool = createTestPool();
  await resetMigrationTestState(pool);
  await runMigration('up');
});

test.after(async () => {
  try {
    await closePool();
  } finally {
    await closeMigrationTestPool(pool);
  }
});

test.beforeEach(async () => {
  await pool.query('DELETE FROM historias');
  await pool.query('DELETE FROM proyectos');
});

test('backlog response includes each persisted immutable story id', async () => {
  const { id, projectId } = await insertStory();

  const response = await request(app).post(`/api/proyectos/${projectId}/backlog`);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    data: [{ id, ...validStory }],
  });
});

test('PATCH /api/historias/:id updates a partial story and returns the complete row', async () => {
  const { id } = await insertStory();

  const response = await request(app).patch(`/api/historias/${id}`).send({
    historia_usuario: 'As a lead, I need the edited story.',
    prioridad: 'Media',
    estimacion_fibonacci: 8,
    rol_sugerido: 'Project Manager',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    data: {
      id,
      ...validStory,
      historia_usuario: 'As a lead, I need the edited story.',
      prioridad: 'Media',
      estimacion_fibonacci: 8,
      rol_sugerido: 'Project Manager',
    },
  });
});

test('PATCH /api/historias/:id JSON-encodes updated acceptance criteria', async () => {
  const { id } = await insertStory();
  const criterios = ['The first criterion is stored.', 'The second criterion is stored.'];

  const response = await request(app)
    .patch(`/api/historias/${id}`)
    .send({ criterios_aceptacion: criterios });
  const [rows] = await pool.execute('SELECT criterios_aceptacion FROM historias WHERE id = ?', [
    id,
  ]);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.criterios_aceptacion, criterios);
  assert.deepEqual(rows[0].criterios_aceptacion, criterios);
});

test('PATCH /api/historias/:id rejects empty, immutable, unknown, and invalid fields', async (t) => {
  const { id } = await insertStory();
  const invalidBodies = [
    {},
    { id },
    { fase: 'Testing' },
    { proyecto_id: 1 },
    { historia_usuario: '   ' },
    { criterios_aceptacion: [] },
    { estimacion_fibonacci: 4 },
    { prioridad: 'Urgente' },
    { rol_sugerido: 'Designer' },
  ];

  for (const body of invalidBodies) {
    await t.test(JSON.stringify(body), async () => {
      const response = await request(app).patch(`/api/historias/${id}`).send(body);

      assert.equal(response.status, 400);
      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'VALIDATION_ERROR');
      assert.equal(response.body.error.message, 'Request validation failed');
    });
  }
});

test('PATCH /api/historias/:id uses validation and uniform not-found envelopes', async () => {
  const invalid = await request(app).patch('/api/historias/not-an-id').send({ prioridad: 'Baja' });
  const unknown = await request(app).patch('/api/historias/4294967295').send({ prioridad: 'Baja' });

  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
  assert.equal(unknown.status, 404);
  assert.deepEqual(unknown.body, {
    success: false,
    error: { code: 'STORY_NOT_FOUND', message: 'Story not found' },
  });
});
