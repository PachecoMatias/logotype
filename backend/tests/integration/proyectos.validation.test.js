import assert from 'node:assert/strict';
import test from 'node:test';

import { validate } from '../../src/middleware/validate.js';
import { projectBodySchema, projectIdParamsSchema } from '../../src/schemas/proyectos.schemas.js';
import {
  createConditionalProjectPayload,
  createValidProjectPayload,
} from '../fixtures/proyecto-payload.js';

test('preserves unknown fields at the root and every nested configurator boundary', () => {
  const payload = createValidProjectPayload();
  const result = projectBodySchema.safeParse(payload);

  assert.equal(result.success, true);
  assert.equal(result.data.futureRootField, 'preserved');
  assert.equal(result.data.empresa.futureEmpresaField, 'preserved');
  assert.equal(result.data.proyecto.futureProyectoField, 'preserved');
  assert.equal(result.data.problema.futureProblemaField, 'preserved');
  assert.equal(result.data.funcionalidades.futureFuncionalidadesField, 'preserved');
  assert.equal(result.data.alcance.futureAlcanceField, 'preserved');
  assert.equal(result.data.presupuesto.futurePresupuestoField, 'preserved');
});

test('accepts conditional fields and omitted optional information', () => {
  const conditionalPayload = createConditionalProjectPayload();
  const withoutOptionalInformation = createValidProjectPayload();

  delete withoutOptionalInformation.presupuesto.infoAdicional;

  assert.equal(projectBodySchema.safeParse(conditionalPayload).success, true);
  assert.equal(projectBodySchema.safeParse(withoutOptionalInformation).success, true);
});

test('rejects invalid known fields with safe validation details', () => {
  const invalidEmail = createValidProjectPayload();
  invalidEmail.empresa.email = 'not-an-email';
  const missingConditionalValue = createValidProjectPayload();
  missingConditionalValue.funcionalidades.seleccionadas = ['Otra'];
  const unsupportedOption = createValidProjectPayload();
  unsupportedOption.proyecto.tipoProyecto = 'unsupported';

  for (const payload of [invalidEmail, missingConditionalValue, unsupportedOption]) {
    const result = projectBodySchema.safeParse(payload);

    assert.equal(result.success, false);
    assert.ok(result.error.issues.every((issue) => issue.path.length > 0));
  }
});

test('rejects invalid project identifiers before a persistence callback can run', () => {
  for (const id of ['0', '-1', '4294967296', 'not-an-id']) {
    assert.equal(projectIdParamsSchema.safeParse({ id }).success, false);
  }

  const request = { body: { empresa: { email: 'invalid' } } };
  let nextError;
  let persistenceCalled = false;
  const middleware = validate(projectBodySchema, 'body');

  middleware(request, {}, (error) => {
    nextError = error;
    if (!error) {
      persistenceCalled = true;
    }
  });

  assert.equal(persistenceCalled, false);
  assert.equal(nextError.code, 'VALIDATION_ERROR');
  assert.ok(nextError.details.every((detail) => typeof detail.path === 'string'));
});
