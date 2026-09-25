import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { app } from '../../src/app.js';
import { closePool } from '../../src/config/database.js';
import { proyectosRepository } from '../../src/repositories/proyectos.repository.js';
import {
  closeMigrationTestPool,
  createTestPool,
  resetMigrationTestState,
  runMigration,
} from '../helpers/test-database.js';
import {
  createConditionalProjectPayload,
  createValidProjectPayload,
} from '../fixtures/proyecto-payload.js';

let pool;

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

test('POST /api/proyectos persists the exact accepted payload with server-owned estado', async () => {
  const payload = createValidProjectPayload();
  const response = await request(app).post('/api/proyectos').send(payload);

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.estado, 'nuevo');
  assert.equal(response.body.data.payload.estado, 'client-value');
  assert.deepEqual(response.body.data.payload, payload);

  const [rows] = await pool.query('SELECT payload, estado FROM proyectos');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].estado, 'nuevo');
  assert.deepEqual(rows[0].payload, payload);
});

test('POST /api/proyectos rejects invalid input without inserting a project', async () => {
  const payload = createConditionalProjectPayload();
  delete payload.funcionalidades.otra;
  const response = await request(app).post('/api/proyectos').send(payload);
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM proyectos');

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.equal(rows[0].count, 0);
});

test('GET /api/proyectos returns empty and ordered persisted collections', async () => {
  const emptyResponse = await request(app).get('/api/proyectos');

  assert.equal(emptyResponse.status, 200);
  assert.deepEqual(emptyResponse.body, { success: true, data: [] });

  await request(app).post('/api/proyectos').send(createValidProjectPayload()).expect(201);
  const secondPayload = createValidProjectPayload();
  secondPayload.empresa.nombreEmpresa = 'Second project';
  await request(app).post('/api/proyectos').send(secondPayload).expect(201);

  const response = await request(app).get('/api/proyectos');

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.deepEqual(
    response.body.data.map((project) => project.id),
    [...response.body.data.map((project) => project.id)].sort((left, right) => left - right),
  );
});

test('GET /api/proyectos/:id returns existing, unknown, and invalid identifier envelopes', async () => {
  const created = await request(app)
    .post('/api/proyectos')
    .send(createValidProjectPayload())
    .expect(201);
  const existing = await request(app).get(`/api/proyectos/${created.body.data.id}`);
  const unknown = await request(app).get('/api/proyectos/4294967295');
  const invalid = await request(app).get('/api/proyectos/not-an-id');

  assert.equal(existing.status, 200);
  assert.equal(existing.body.data.id, created.body.data.id);
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.error.code, 'PROJECT_NOT_FOUND');
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
});

test('converts an unexpected repository failure into a safe internal envelope', async () => {
  const restore = test.mock.method(proyectosRepository, 'findAll', async () => {
    throw new Error('SELECT secret FROM credentials at C:\\private\\database.js');
  });

  try {
    const response = await request(app).get('/api/proyectos');

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  } finally {
    restore.mock.restore();
  }
});
