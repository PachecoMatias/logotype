import assert from 'node:assert/strict';
import test from 'node:test';

import { createGeminiGateway } from '../../src/integrations/gemini.gateway.js';
import { createAdvisorService } from '../../src/services/advisor/advisor-service.js';

function gatewayWith(generateContent) {
  return createGeminiGateway({
    getConfiguration: () => ({ apiKey: 'test-key', model: 'test-model' }),
    createClient: () => ({ models: { generateContent } }),
  });
}

function providerApiError(status, symbolicStatus, message = 'provider unavailable') {
  const error = new Error(JSON.stringify({ error: { status: symbolicStatus, message } }));
  error.name = 'ApiError';
  error.status = status;
  return error;
}

function story(overrides = {}) {
  return {
    id: 'hu-1',
    texto: 'Como vendedor, quiero registrar ventas, para mantener el stock actualizado',
    origen: 'cliente',
    estado: 'en_detalle',
    bloqueada: false,
    etapa: '1',
    aDetallar: false,
    funcionalidad: 'Gestión de ventas',
    ...overrides,
  };
}

function roundPayload() {
  return {
    sesionId: 'typeerror-origin-fixture',
    cerrar: false,
    estado: {
      idea: 'Una librería necesita registrar ventas.',
      datosIniciales: {
        funcionalidades: ['Gestión de ventas'],
        plataformas: ['Web'],
        tiposUsuario: ['Vendedor'],
        cantidadUsuarios: '10',
      },
      historias: [story()],
      respuestas: [],
      sugerenciasRechazadas: [],
      sugerenciasMostradas: [],
    },
  };
}

function validEnvelope() {
  return {
    historias: [],
    refinadas: [],
    preguntas: [
      ['quien_la_usa', '¿Qué personas registran las ventas?'],
      ['beneficio', '¿Qué beneficio buscás con el registro de ventas?'],
      ['comportamiento', '¿Qué datos necesitás registrar en cada venta?'],
      ['datos_previos', '¿Qué información de productos ya tenés disponible?'],
    ].map(([aspecto, texto]) => ({ aspecto, tipo: 'texto', texto, opciones: [] })),
    sugerencias: [
      {
        tipo: 'mejora',
        texto: '¿Querés identificar las ventas anuladas?',
        basado_en: 'registrar ventas',
        funcionalidad: 'Ventas anuladas',
        descripcion: 'Identificar las ventas anuladas.',
      },
    ],
    duda_critica: '',
  };
}

function gatewayFromQueue(queue) {
  return createGeminiGateway({
    getConfiguration: () => ({ apiKey: 'test-key', model: 'test-model' }),
    createClient: () => ({
      models: {
        generateContent: async () => {
          const next = queue.shift();
          if (next instanceof Error) throw next;
          return next;
        },
      },
    }),
  });
}

function serviceWith(gateway, traces) {
  return createAdvisorService({
    gateway,
    limiter: { consume: () => ({ sessionCalls: 1 }) },
    createId: (prefix) => `${prefix}-fixture`,
    sleep: async () => {},
    logFailure: () => {},
    logRound: () => {},
    logRefinementDiscard: () => {},
    traceRound: (entry) => traces.push(entry),
  });
}

test('503 UNAVAILABLE is captured as a provider API failure, not a TypeError', async () => {
  const gateway = gatewayWith(async () => {
    throw providerApiError(503, 'UNAVAILABLE');
  });

  await assert.rejects(gateway.generateAdvisorRound('prompt'), (error) => {
    assert.equal(error.backlogFailureStage, 'provider');
    assert.equal(error.providerStatus, 503);
    assert.equal(error.providerSymbolicStatus, 'UNAVAILABLE');
    assert.equal(error.errorOrigin, 'provider_api');
    assert.equal(error.rawErrorName, 'ApiError');
    assert.equal(error.networkCode, null);
    assert.equal(error.causeCode, null);
    assert.equal(error.hasResponseText, null);
    assert.equal(error.hasCandidates, null);
    return true;
  });
});

test('fetch TypeError keeps its network cause instead of losing it', async () => {
  const cause = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
  const fetchError = Object.assign(new TypeError('fetch failed'), { cause });
  const gateway = gatewayWith(async () => {
    throw fetchError;
  });

  await assert.rejects(gateway.generateAdvisorRound('prompt'), (error) => {
    assert.equal(error.backlogFailureStage, 'provider');
    assert.equal(error.errorOrigin, 'network');
    assert.equal(error.rawErrorName, 'TypeError');
    assert.equal(error.status === undefined || error.providerStatus === undefined, true);
    assert.equal(error.networkCode, null);
    assert.equal(error.causeName, 'Error');
    assert.equal(error.causeCode, 'ECONNRESET');
    return true;
  });
});

test('SDK TypeError without network evidence is marked as sdk_type_error', async () => {
  const gateway = gatewayWith(async () => {
    throw new TypeError("Cannot read properties of undefined (reading 'candidates')");
  });

  await assert.rejects(gateway.generateAdvisorRound('prompt'), (error) => {
    assert.equal(error.backlogFailureStage, 'provider');
    assert.equal(error.errorOrigin, 'sdk_type_error');
    assert.equal(error.rawErrorName, 'TypeError');
    assert.equal(error.networkCode, null);
    assert.equal(error.causeCode, null);
    return true;
  });
});

test('a throwing response.text getter becomes response_access, not a provider TypeError', async () => {
  const response = {
    candidates: [{ finishReason: 'STOP' }],
    get text() {
      throw new TypeError("Cannot read properties of undefined (reading 'parts')");
    },
  };
  const gateway = gatewayWith(async () => response);

  await assert.rejects(gateway.generateAdvisorRound('prompt'), (error) => {
    assert.equal(error.backlogFailureStage, 'response_text');
    assert.equal(error.errorOrigin, 'response_access');
    assert.equal(error.rawErrorName, 'TypeError');
    assert.equal(error.finishReason, 'STOP');
    assert.equal(error.hasResponseText, false);
    assert.equal(error.hasCandidates, true);
    return true;
  });
});

test('undefined and null provider responses become controlled response_shape failures', async () => {
  for (const response of [undefined, null]) {
    const gateway = gatewayWith(async () => response);

    await assert.rejects(gateway.generateAdvisorRound('prompt'), (error) => {
      assert.equal(error.backlogFailureStage, 'response_text');
      assert.equal(error.errorOrigin, 'response_shape');
      assert.equal(error.rawErrorName, 'ProviderResponseError');
      assert.equal(error.finishReason, null);
      assert.equal(error.hasResponseText, false);
      assert.equal(error.hasCandidates, false);
      return true;
    });
  }
});

test('a response without candidates and without text is a response_shape failure', async () => {
  const gateway = gatewayWith(async () => ({ candidates: [], text: undefined }));

  await assert.rejects(gateway.generateAdvisorRound('prompt'), (error) => {
    assert.equal(error.backlogFailureStage, 'response_text');
    assert.equal(error.errorOrigin, 'response_shape');
    assert.equal(error.rawErrorName, 'ProviderResponseError');
    assert.equal(error.hasResponseText, false);
    assert.equal(error.hasCandidates, false);
    return true;
  });
});

test('one action makes a single provider call and the manual retry recovers', async () => {
  const queue = [
    providerApiError(503, 'UNAVAILABLE'),
    { candidates: [{ finishReason: 'STOP' }], text: JSON.stringify(validEnvelope()) },
  ];
  const traces = [];
  const service = serviceWith(gatewayFromQueue(queue), traces);

  const degraded = await service.round(roundPayload(), { ip: 'fixture' });
  const recovered = await service.round(roundPayload(), { ip: 'fixture' });

  assert.equal(degraded.degradado, true);
  assert.equal(degraded.motivoDegradado, 'provider');
  assert.equal(traces[0].providerAttempts, 1);
  assert.deepEqual(traces[0].providerFailure, {
    stage: 'provider',
    statusCode: 503,
    symbolicStatus: 'UNAVAILABLE',
    reason: null,
    errorOrigin: 'provider_api',
    networkCode: null,
    causeName: null,
    causeCode: null,
    rawErrorName: 'ApiError',
    finishReason: null,
    hasResponseText: null,
    hasCandidates: null,
    messageSanitized: 'provider_failure',
  });

  assert.equal(recovered.degradado, false);
  assert.equal(recovered.motivoDegradado, null);
  assert.equal(recovered.preguntas.length, 4);
  assert.equal(recovered.sugerencias.length, 1);
  assert.equal(traces[1].providerAttempts, 1);
  assert.equal(traces[1].providerError, null);
  assert.equal(traces[1].providerFailure, null);
});

test('a manual retry after a network failure makes one new call and recovers', async () => {
  const queue = [
    Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('getaddrinfo EAI_AGAIN'), { code: 'EAI_AGAIN' }),
    }),
    { candidates: [{ finishReason: 'STOP' }], text: JSON.stringify(validEnvelope()) },
  ];
  const traces = [];
  const service = serviceWith(gatewayFromQueue(queue), traces);

  const degraded = await service.round(roundPayload(), { ip: 'fixture' });
  const recovered = await service.round(roundPayload(), { ip: 'fixture' });

  assert.equal(degraded.degradado, true);
  assert.equal(traces[0].providerAttempts, 1);
  assert.equal(traces[0].providerFailure.errorOrigin, 'network');
  assert.equal(traces[0].providerFailure.causeCode, 'EAI_AGAIN');

  assert.equal(recovered.degradado, false);
  assert.equal(traces[1].providerAttempts, 1);
  assert.equal(recovered.preguntas.length, 4);
});
