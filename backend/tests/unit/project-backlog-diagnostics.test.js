import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../../src/errors/app-error.js';
import { createGeminiGateway } from '../../src/integrations/gemini.gateway.js';
import { errorHandler } from '../../src/middleware/error-handler.js';
import { createProyectosService } from '../../src/services/proyectos.service.js';
import { createValidProjectPayload } from '../fixtures/proyecto-payload.js';

const validAnalysis = {
  viable: true,
  completitud: 'completo',
  campos_faltantes: [],
  observaciones: 'The submitted scope is internally consistent.',
  mensaje_para_cliente: 'The project can proceed to planning.',
};

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

function createHarness(generateProjectBacklog) {
  const diagnostics = [];
  let persistenceCalls = 0;
  const service = createProyectosService({
    repository: {
      async findById() {
        return {
          id: 41,
          estado: 'analizado',
          payload: createValidProjectPayload(),
          analisisIa: validAnalysis,
        };
      },
    },
    historiasRepository: {
      async findByProjectId() {
        return [];
      },
      async persistGeneratedBacklog() {
        persistenceCalls += 1;
        return { outcome: 'committed', stories: [] };
      },
    },
    geminiGateway: { generateProjectBacklog },
    getConfiguration: () => ({ database: 'test' }),
    buildBacklogPrompt: () => 'controlled prompt containing private project data',
    logBacklogFailure(diagnostic) {
      diagnostics.push(diagnostic);
    },
  });

  return { diagnostics, getPersistenceCalls: () => persistenceCalls, service };
}

function assertPublicFailure(error) {
  assert.ok(error instanceof AppError);
  assert.equal(error.status, 502);
  assert.equal(error.code, 'AI_ANALYSIS_FAILED');
  assert.equal(error.message, 'AI analysis failed');

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
    error: { code: 'AI_ANALYSIS_FAILED', message: 'AI analysis failed' },
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
