import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAdvisorProjectPayload } from '../../../frontend/src/utils/asesorPayload.js';
import { validate } from '../../src/middleware/validate.js';
import { projectBodySchema, projectIdParamsSchema } from '../../src/schemas/proyectos.schemas.js';
import {
  createAdvisorContext,
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

test('preserves the complete optional advisor context without weakening required fields', () => {
  const payload = createValidProjectPayload();
  payload.asesoramiento = createAdvisorContext();

  const result = projectBodySchema.safeParse(payload);

  assert.equal(result.success, true);
  assert.deepEqual(result.data.asesoramiento, payload.asesoramiento);

  delete payload.problema.procesoActual;
  assert.equal(projectBodySchema.safeParse(payload).success, false);
});

test('accepts frontend-built advisor v2 payloads with objectives, without objectives, and without advisor', () => {
  const base = {
    idea: 'Una ferretería necesita ordenar las ventas.',
    initialData: {
      funcionalidades: ['Gestión de ventas'],
      otraFuncionalidad: '',
      otrasFuncionalidades: [],
      plataformas: ['Web'],
      tiposUsuario: ['Administrador'],
      tiposUsuarioOtro: '',
      cantidadUsuarios: '10 - 50',
      procesoActual: 'Las ventas se registran manualmente en un cuaderno.',
      tipoProyecto: 'gestion',
    },
    histories: [
      {
        id: 'hu-1',
        texto: 'Como vendedor, quiero registrar ventas, para reducir errores.',
        estado: 'entendida',
        etapa: '1',
        aDetallar: false,
        funcionalidad: 'Gestión de ventas',
      },
    ],
    answers: [],
    acceptedSuggestions: [],
    rejectedSuggestions: [],
    complete: true,
    rounds: 2,
    finalData: {
      empresa: {
        nombreEmpresa: 'Ferretería Norte',
        contacto: 'Ana Pérez',
        email: 'ana@example.com',
        telefono: '3810000000',
        rubro: 'Comercio',
        rubroOtro: '',
      },
      presupuesto: {
        presupuesto: 'USD 1.000 - 5.000',
        plazo: '3 - 6 meses',
        infoAdicional: '',
      },
    },
  };
  const cases = [
    {
      objectives: [{ texto: 'Reducir errores de carga', basadoEn: 'registran manualmente' }],
      withoutAdvisor: false,
    },
    { objectives: [], withoutAdvisor: false },
    { objectives: [], withoutAdvisor: true },
  ];

  for (const scenario of cases) {
    const payload = buildAdvisorProjectPayload({ ...base, ...scenario });
    assert.equal(projectBodySchema.safeParse(payload).success, true);
  }
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
