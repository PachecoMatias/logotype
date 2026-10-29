import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../../src/errors/app-error.js';
import { createGeminiGateway } from '../../src/integrations/gemini.gateway.js';
import { errorHandler } from '../../src/middleware/error-handler.js';
import { createProyectosService } from '../../src/services/proyectos.service.js';
import { createAdvisorContext, createValidProjectPayload } from '../fixtures/proyecto-payload.js';

const validAnalysis = {
  viable: true,
  completitud: 'completo',
  campos_faltantes: [],
  observaciones: 'The submitted scope is internally consistent.',
  mensaje_para_cliente: 'The project can proceed to planning.',
};

const publicAiFailureMessage =
  'El servicio de IA no está disponible temporalmente. Intentá nuevamente más tarde.';

function createValidStory(index) {
  return {
    fase: 'Desarrollo Backend',
    prioridad: 'Alta',
    historia_usuario: `As a planner, I need backlog item ${index + 1}.`,
    descripcion: `Deliver backlog item ${index + 1}.`,
    criterios_aceptacion: ['The bounded behavior is verified.'],
    alcance_tecnico: 'Backend only.',
    estimacion_fibonacci: 3,
    rol_sugerido: 'Backend',
  };
}

function createValidAdvisorBacklog() {
  return Array.from({ length: 12 }, (_, index) => {
    const story = createValidStory(index);
    const metadata =
      index < 3
        ? 'tipo=historia_usuario; origen=derivada_ia; padre=hu-1; aprobacion=aprobada'
        : index === 11
          ? 'tipo=historia_usuario; origen=derivada_ia; padre=hu-2; aprobacion=propuesta'
          : 'tipo=tarea_tecnica; origen=tecnica; padre=hu-1; aprobacion=aprobada';

    return {
      ...story,
      historia_usuario:
        index < 3
          ? [
              'Como cajero, quiero registrar los productos vendidos, para completar la venta.',
              'Como cajero, quiero calcular el total, para cobrar el importe correcto.',
              'Como cajero, quiero registrar el medio de pago, para completar el cobro.',
            ][index]
          : index === 11
            ? 'Como gerente, quiero evaluar alertas de reposición, para anticipar compras.'
            : `Implementar tarea técnica ${index}`,
      descripcion: `[BACKLOG ${metadata}] ${story.descripcion}`,
    };
  });
}

function createLibraryPayload() {
  const payload = createValidProjectPayload();
  payload.asesoramiento = {
    historias: [
      {
        id: 'hu-ventas',
        texto:
          'Como vendedor o administrador, quiero registrar las ventas de libros en el sistema web, para agilizar la atención, evitar errores de cobro y controlar las ventas del día.',
        estado: 'entendida',
      },
      {
        id: 'hu-stock',
        texto:
          'Como administrador o vendedor, quiero controlar el stock de libros, para evitar faltantes y mantener actualizado el inventario.',
        estado: 'entendida',
      },
      {
        id: 'hu-alertas',
        texto:
          'Como administrador, quiero recibir alertas de stock mínimo de libros, para reponer ejemplares a tiempo.',
        estado: 'entendida',
      },
      {
        id: 'hu-propuesta',
        texto: 'Como administrador, quiero pronosticar demanda, para anticipar compras.',
        estado: 'supuesta',
        aDetallar: true,
      },
    ],
  };
  return payload;
}

function createLibraryBacklog() {
  const functional = [
    {
      title:
        'Como vendedor o administrador quiero registrar las ventas de libros en el sistema web para agilizar la atención evitar errores de cobro y controlar las ventas del día',
      parent: 'hu-ventas',
    },
    {
      title:
        'Como administrador o vendedor quiero controlar el stock de libros para evitar faltantes y mantener actualizado el inventario',
      parent: 'hu-stock',
    },
    {
      title:
        'Como administrador quiero recibir alertas de stock mínimo de libros para reponer ejemplares a tiempo',
      parent: 'hu-alertas',
    },
  ];
  const cards = Array.from({ length: 12 }, (_, index) => ({
    ...createValidStory(index),
    historia_usuario: `Implementar tarea técnica ${index}`,
    descripcion: `[BACKLOG tipo=tarea_tecnica; origen=tecnica; padre=hu-ventas; aprobacion=aprobada] Implementación técnica verificable ${index}.`,
  }));

  for (const [position, story] of [0, 2, 4].entries()) {
    cards[story] = {
      ...createValidStory(story),
      historia_usuario: functional[position].title,
      descripcion: `[BACKLOG tipo=historia_usuario; origen=cliente; padre=${functional[position].parent}; aprobacion=aprobada] Cobertura funcional confirmada.`,
    };
  }
  cards[5] = {
    ...createValidStory(5),
    historia_usuario: 'Investigar el canal de entrega de alertas',
    descripcion:
      '[BACKLOG tipo=spike; origen=tecnica; padre=hu-alertas; aprobacion=aprobada] Investigación acotada del canal de alertas.',
  };
  cards[11] = {
    ...createValidStory(11),
    historia_usuario: 'Como administrador, quiero pronosticar demanda, para anticipar compras.',
    descripcion:
      '[BACKLOG tipo=historia_usuario; origen=derivada_ia; padre=hu-propuesta; aprobacion=propuesta] Funcionalidad adicional pendiente de aprobación.',
  };
  return cards;
}

function createHarness(generateProjectBacklog, payload = createValidProjectPayload()) {
  const diagnostics = [];
  let providerCalls = 0;
  let persistenceCalls = 0;
  let persistedStories = null;
  const service = createProyectosService({
    repository: {
      async findById() {
        return {
          id: 41,
          estado: 'analizado',
          decisionViabilidad: 'VIABLE',
          payload,
          analisisIa: validAnalysis,
        };
      },
    },
    historiasRepository: {
      async findByProjectId() {
        return [];
      },
      async persistGeneratedBacklog(_configuration, _projectId, stories) {
        persistenceCalls += 1;
        persistedStories = structuredClone(stories);
        return { outcome: 'committed', stories };
      },
    },
    geminiGateway: {
      async generateProjectBacklog(...args) {
        providerCalls += 1;
        return generateProjectBacklog(...args);
      },
    },
    getConfiguration: () => ({ database: 'test' }),
    buildBacklogPrompt: () => 'controlled prompt containing private project data',
    logBacklogFailure(diagnostic) {
      diagnostics.push(diagnostic);
    },
  });

  return {
    diagnostics,
    getPersistedStories: () => persistedStories,
    getPersistenceCalls: () => persistenceCalls,
    getProviderCalls: () => providerCalls,
    service,
  };
}

function assertPublicFailure(error) {
  assert.ok(error instanceof AppError);
  assert.equal(error.status, 502);
  assert.equal(error.code, 'AI_ANALYSIS_FAILED');
  assert.equal(error.message, publicAiFailureMessage);

  let status;
  let body;
  errorHandler(
    error,
    {},
    {
      headersSent: false,
      status(nextStatus) {
        status = nextStatus;
        return this;
      },
      json(nextBody) {
        body = nextBody;
      },
    },
    assert.fail,
  );
  assert.equal(status, 502);
  assert.deepEqual(body, {
    success: false,
    error: { code: 'AI_ANALYSIS_FAILED', message: publicAiFailureMessage },
  });
}

async function captureFailure(harness) {
  let failure;

  try {
    await harness.service.generateProjectBacklog(41);
  } catch (error) {
    failure = error;
  }

  assertPublicFailure(failure);
  assert.equal(harness.getPersistenceCalls(), 0);
  assert.equal(harness.diagnostics.length, 1);
  return harness.diagnostics[0];
}

test('classifies and redacts a provider rejection without persistence or public leakage', async () => {
  const providerError = new Error(
    JSON.stringify({
      error: {
        status: 'INVALID_ARGUMENT',
        message:
          'The specified response schema is too complex. secret-key prompt C:\\private\\sdk.js',
      },
    }),
  );
  providerError.name = 'ApiError';
  providerError.status = 400;
  providerError.code = 'ECONNRESET';
  const gateway = createGeminiGateway({
    getConfiguration: () => ({ apiKey: 'secret-key', model: 'gemini-2.5-flash' }),
    createClient: () => ({
      models: {
        async generateContent() {
          throw providerError;
        },
      },
    }),
  });
  const diagnostic = await captureFailure(createHarness(gateway.generateProjectBacklog));

  assert.deepEqual(diagnostic, {
    stage: 'provider',
    errorName: 'ApiError',
    projectId: 41,
    providerStatus: 400,
    providerSymbolicStatus: 'INVALID_ARGUMENT',
    providerReason: 'response_schema_too_complex',
    networkCode: 'ECONNRESET',
    model: 'gemini-2.5-flash',
  });
  assert.doesNotMatch(
    JSON.stringify(diagnostic),
    /secret-key|prompt|private|sdk|specified|controlled/i,
  );
});

test('allowlists provider status and reason while discarding arbitrary structured fields', async () => {
  const cases = [
    {
      status: 'INVALID_ARGUMENT',
      message: 'Request contains an invalid response schema. private payload',
      expectedStatus: 'INVALID_ARGUMENT',
      expectedReason: 'invalid_response_schema',
    },
    {
      status: 'INVALID_ARGUMENT\nPRIVATE',
      message: 'Unrestricted provider details with secret-key and C:\\private\\sdk.js',
      expectedStatus: undefined,
      expectedReason: undefined,
    },
    {
      status: 'INVALID_ARGUMENT',
      message: 'Unrestricted provider details with secret-key and C:\\private\\sdk.js',
      expectedStatus: 'INVALID_ARGUMENT',
      expectedReason: 'other_invalid_argument',
    },
    {
      status: 'INVALID_ARGUMENT',
      message: 'The specified schema produces a constraint that has too many states for serving.',
      expectedStatus: 'INVALID_ARGUMENT',
      expectedReason: 'response_schema_too_complex',
    },
  ];

  for (const sample of cases) {
    const providerError = new Error(
      JSON.stringify({
        error: {
          status: sample.status,
          message: sample.message,
          details: [{ unrestricted: 'raw provider body' }],
        },
        request: { prompt: 'private project payload' },
      }),
    );
    providerError.name = 'ApiError';
    providerError.status = 400;
    const gateway = createGeminiGateway({
      getConfiguration: () => ({ apiKey: 'secret-key', model: 'gemini-2.5-flash' }),
      createClient: () => ({
        models: {
          async generateContent() {
            throw providerError;
          },
        },
      }),
    });
    const diagnostic = await captureFailure(createHarness(gateway.generateProjectBacklog));

    assert.equal(diagnostic.providerSymbolicStatus, sample.expectedStatus);
    assert.equal(diagnostic.providerReason, sample.expectedReason);
    assert.doesNotMatch(
      JSON.stringify(diagnostic),
      /secret-key|private|sdk|raw provider body|project payload|unrestricted/i,
    );
  }
});

test('classifies malformed JSON and excludes raw provider output', async () => {
  const rawProviderText = '{"apiKey":"secret-key", not-json';
  const diagnostic = await captureFailure(createHarness(async () => rawProviderText));

  assert.deepEqual(diagnostic, {
    stage: 'json_parse',
    errorName: 'SyntaxError',
    projectId: 41,
  });
  assert.doesNotMatch(JSON.stringify(diagnostic), /secret-key|apiKey|not-json/);
});

test('classifies schema validation with only Zod issue codes and paths', async () => {
  const invalidBacklog = Array.from({ length: 12 }, (_, index) => createValidStory(index));
  invalidBacklog[0] = {
    ...invalidBacklog[0],
    prioridad: 'critical-secret',
    criterios_aceptacion: [],
  };
  const diagnostic = await captureFailure(
    createHarness(async () => JSON.stringify(invalidBacklog)),
  );

  assert.equal(diagnostic.stage, 'schema_validation');
  assert.equal(diagnostic.errorName, 'ZodError');
  assert.equal(diagnostic.projectId, 41);
  assert.deepEqual(diagnostic.zodIssues, [
    { code: 'invalid_value', path: [0, 'prioridad'] },
    { code: 'too_small', path: [0, 'criterios_aceptacion'] },
  ]);
  assert.doesNotMatch(JSON.stringify(diagnostic), /critical-secret|message|expected|received/i);
});

test('rejects advisor backlog without validated traceability before persistence', async () => {
  const payload = createValidProjectPayload();
  payload.asesoramiento = createAdvisorContext();
  const backlogWithoutMetadata = Array.from({ length: 12 }, (_, index) => createValidStory(index));
  const diagnostic = await captureFailure(
    createHarness(async () => JSON.stringify(backlogWithoutMetadata), payload),
  );

  assert.equal(diagnostic.stage, 'semantic_validation');
  assert.equal(diagnostic.errorName, 'BacklogSemanticError');
  assert.equal(diagnostic.projectId, 41);
  assert.ok(
    diagnostic.zodIssues.some(
      (issue) => issue.code === 'custom' && issue.path.join('.') === '0.descripcion',
    ),
  );
  assert.doesNotMatch(
    JSON.stringify(diagnostic),
    /backlog item|Descripción sin|controlled prompt/i,
  );
});

test('passes validated advisor metadata unchanged to atomic persistence', async () => {
  const payload = createValidProjectPayload();
  payload.asesoramiento = createAdvisorContext();
  const generated = createValidAdvisorBacklog();
  const harness = createHarness(async () => JSON.stringify(generated), payload);

  const result = await harness.service.generateProjectBacklog(41);

  assert.equal(harness.getPersistenceCalls(), 1);
  assert.equal(harness.getProviderCalls(), 1);
  assert.deepEqual(harness.getPersistedStories(), generated);
  assert.deepEqual(result, generated);
  assert.equal(
    result.filter((story) => story.descripcion.includes('aprobacion=propuesta')).length,
    1,
  );
});

test('logs the bounded rejected field value without unrelated provider or project data', async () => {
  const payload = createLibraryPayload();
  const generated = createLibraryBacklog();
  generated[0] = {
    ...generated[0],
    historia_usuario: '  Como   cajero, quiero registrar ventas apiKey=secret-key  ',
    descripcion: generated[0].descripcion.replace('origen=cliente', 'origen=derivada_ia'),
    criterios_aceptacion: ['secret-acceptance-data that is unrelated to the rejected field'],
    alcance_tecnico: 'secret-technical-detail that must stay out of diagnostics',
  };
  const diagnostic = await captureFailure(
    createHarness(async () => JSON.stringify(generated), payload),
  );

  assert.equal(diagnostic.stage, 'semantic_validation');
  assert.deepEqual(diagnostic.semanticIssues, [
    {
      index: 0,
      cardType: 'historia_usuario',
      rule: 'functional_user_story_required',
      origin: 'derivada_ia',
      parent: 'hu-ventas',
      field: 'historia_usuario',
      receivedValue: 'Como   cajero, quiero registrar ventas apiKey=[REDACTED]',
      normalizedValue: 'Como cajero, quiero registrar ventas apiKey=[REDACTED]',
    },
  ]);
  assert.doesNotMatch(
    JSON.stringify(diagnostic),
    /secret-key|secret-acceptance-data|secret-technical-detail|Cobertura funcional|criterios_aceptacion|controlled prompt/i,
  );
});

test('truncates rejected field values before logging them', async () => {
  const payload = createLibraryPayload();
  const generated = createLibraryBacklog();
  generated[0] = {
    ...generated[0],
    historia_usuario: `Como cajero, quiero ${'registrar detalles '.repeat(20)}`,
    descripcion: generated[0].descripcion.replace('origen=cliente', 'origen=derivada_ia'),
  };
  const diagnostic = await captureFailure(
    createHarness(async () => JSON.stringify(generated), payload),
  );

  assert.equal(diagnostic.semanticIssues.length, 1);
  assert.equal(diagnostic.semanticIssues[0].receivedValue.length, 240);
  assert.match(
    diagnostic.semanticIssues[0].receivedValue,
    /^Como cajero, quiero registrar detalles /u,
  );
  assert.match(diagnostic.semanticIssues[0].receivedValue, /…$/u);
  assert.equal('normalizedValue' in diagnostic.semanticIssues[0], false);
});

test('redacts quoted JSON credentials and HTTP authorization values', async () => {
  const payload = createLibraryPayload();
  const generated = createLibraryBacklog();
  generated[0] = {
    ...generated[0],
    historia_usuario:
      'Como cajero, quiero vender {"apiKey":"sk-live-json"} Authorization: Basic dXNlcjpwYXNz',
    descripcion: generated[0].descripcion.replace('origen=cliente', 'origen=derivada_ia'),
  };
  const diagnostic = await captureFailure(
    createHarness(async () => JSON.stringify(generated), payload),
  );
  const serialized = JSON.stringify(diagnostic);

  assert.doesNotMatch(serialized, /sk-live-json|dXNlcjpwYXNz/u);
  assert.match(diagnostic.semanticIssues[0].receivedValue, /\[REDACTED\]/u);
});

test('persists the mixed Librería Norte backlog after semantic validation', async () => {
  const payload = createLibraryPayload();
  const generated = createLibraryBacklog();
  const harness = createHarness(async () => JSON.stringify(generated), payload);

  const result = await harness.service.generateProjectBacklog(41);

  assert.equal(harness.getPersistenceCalls(), 1);
  assert.deepEqual(harness.getPersistedStories(), generated);
  assert.deepEqual(result, generated);
  assert.equal(result[0].prioridad, 'Alta');
  assert.equal(result[0].estimacion_fibonacci, 3);
  assert.deepEqual(result[0].criterios_aceptacion, ['The bounded behavior is verified.']);
});
