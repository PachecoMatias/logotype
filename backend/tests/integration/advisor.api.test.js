import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { app } from '../../src/app.js';
import { maxLargoIdea, maxRondasSesion } from '../../src/config/advisor-config.js';
import { geminiGateway } from '../../src/integrations/gemini.gateway.js';
import { advisorRateLimiter } from '../../src/services/advisor/advisor-rate-limiter.js';

function story(overrides = {}) {
  return {
    id: 'hu-1',
    texto: 'Como vendedor, quiero registrar ventas, para mantener el stock actualizado',
    estado: 'entendida',
    bloqueada: false,
    etapa: '1',
    aDetallar: false,
    funcionalidad: 'Gestión de ventas',
    ...overrides,
  };
}

function answer(aspecto, overrides = {}) {
  return {
    preguntaId: `q-${aspecto}`,
    historiaId: 'hu-1',
    aspecto,
    pregunta: `Pregunta sobre ${aspecto}`,
    respuesta: 'Respuesta concreta',
    noSabe: false,
    integrada: false,
    ...overrides,
  };
}

function state(overrides = {}) {
  return {
    idea: 'Una ferretería necesita registrar ventas y actualizar el stock.',
    datosIniciales: {
      funcionalidades: ['Gestión de ventas', 'Gestión de stock'],
      plataformas: ['Web'],
      tiposUsuario: ['Vendedor', 'Administrador'],
      cantidadUsuarios: '10',
    },
    historias: [],
    respuestas: [],
    sugerenciasRechazadas: [],
    ...overrides,
  };
}

function body(overrides = {}) {
  return {
    sesionId: 'session-public-1',
    estado: state(),
    ...overrides,
  };
}

function providerResult(overrides = {}) {
  return JSON.stringify({
    historias: [
      {
        id: 'hu-1',
        texto: 'Como vendedor, quiero registrar ventas, para mantener el stock actualizado',
        estado: 'sugerida_ia',
        etapa: '1',
      },
    ],
    preguntas: [
      {
        aspecto: 'quien_la_usa',
        tipo: 'opcion',
        texto: '¿Quién registra las ventas habitualmente?',
        opciones: ['Vendedor', 'Administrador'],
      },
    ],
    sugerencias: [{ tipo: 'complementaria', texto: 'Registrar devoluciones de productos' }],
    duda_critica: '',
    ...overrides,
  });
}

test.beforeEach(() => {
  advisorRateLimiter.reset();
});

test('POST /api/asesor/ronda is public and runs an INICIAL round', async () => {
  let calls = 0;
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async () => {
    calls += 1;
    return providerResult();
  });

  try {
    const response = await request(app).post('/api/asesor/ronda').send(body());

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(calls, 1);
    assert.equal(response.body.data.historias.length, 1);
    assert.deepEqual(response.body.data.foco, { historiaId: 'hu-1' });
    assert.equal(response.body.data.preguntas[0].aspecto, 'quien_la_usa');
    assert.equal(response.body.data.completo, false);
    assert.equal(response.body.data.motivoCierre, null);
  } finally {
    restore.mock.restore();
  }
});

test('INICIAL recovers a provider-authored state for a new story', async () => {
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async () =>
    providerResult({
      historias: [
        {
          id: 'hu-1',
          texto: 'Como vendedor, quiero registrar ventas, para mantener el stock actualizado',
          estado: 'sugerida',
          etapa: '1',
        },
      ],
    }),
  );

  try {
    const response = await request(app).post('/api/asesor/ronda').send(body());

    assert.equal(response.status, 200);
    assert.equal(response.body.data.historias.length, 1);
    assert.equal(response.body.data.historias[0].estado, 'sugerida_ia');
  } finally {
    restore.mock.restore();
  }
});

test('CONTINUAR integrates pending answers and keeps questions on one focused story', async () => {
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async () =>
    providerResult({
      historias: [
        {
          id: 'hu-1',
          texto: 'Como vendedor, quiero registrar ventas, para mantener el stock actualizado',
          estado: 'entendida',
          etapa: '1',
        },
      ],
      preguntas: [
        {
          aspecto: 'beneficio',
          tipo: 'texto',
          texto: '¿Qué mejora espera obtener?',
          opciones: [],
        },
      ],
    }),
  );

  try {
    const response = await request(app)
      .post('/api/asesor/ronda')
      .send(
        body({
          estado: state({
            historias: [story()],
            respuestas: [answer('quien_la_usa')],
          }),
        }),
      );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.preguntas[0].aspecto, 'beneficio');
    assert.equal(response.body.data.historias[0].id, 'hu-1');
  } finally {
    restore.mock.restore();
  }
});

test('CIERRE without pending answers completes without calling Gemini', async () => {
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async () => {
    assert.fail('Gemini must not be called');
  });

  try {
    const completedAnswers = [
      'quien_la_usa',
      'beneficio',
      'comportamiento',
      'datos_previos',
      'volumen',
      'restricciones',
    ].map((aspecto) => answer(aspecto, { integrada: true }));
    const response = await request(app)
      .post('/api/asesor/ronda')
      .send(body({ estado: state({ historias: [story()], respuestas: completedAnswers }) }));

    assert.equal(response.status, 200);
    assert.equal(response.body.data.completo, true);
    assert.equal(response.body.data.motivoCierre, 'completo');
    assert.deepEqual(response.body.data.preguntas, []);
  } finally {
    restore.mock.restore();
  }
});

test('cerrar=true integrates pending answers without returning questions', async () => {
  let calls = 0;
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async () => {
    calls += 1;
    return providerResult({ preguntas: [] });
  });

  try {
    const response = await request(app)
      .post('/api/asesor/ronda')
      .send(
        body({
          cerrar: true,
          estado: state({ historias: [story()], respuestas: [answer('quien_la_usa')] }),
        }),
      );

    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    assert.equal(response.body.data.completo, true);
    assert.equal(response.body.data.motivoCierre, 'cerrado_por_cliente');
    assert.deepEqual(response.body.data.preguntas, []);
  } finally {
    restore.mock.restore();
  }
});

test('the final allowed session round closes with limite and makes no provider call', async () => {
  for (let round = 1; round < maxRondasSesion; round += 1) {
    advisorRateLimiter.consume('seed-ip', 'session-at-limit');
  }
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async () => {
    assert.fail('Gemini must not be called at the configured session limit');
  });

  try {
    const response = await request(app)
      .post('/api/asesor/ronda')
      .send(body({ sesionId: 'session-at-limit', estado: state({ historias: [story()] }) }));

    assert.equal(response.status, 200);
    assert.equal(response.body.data.completo, true);
    assert.equal(response.body.data.motivoCierre, 'limite');
  } finally {
    restore.mock.restore();
  }
});

test('request size validation returns the uniform 400 envelope', async () => {
  const response = await request(app)
    .post('/api/asesor/ronda')
    .send(body({ estado: state({ idea: 'x'.repeat(maxLargoIdea + 1) }) }));

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('session rate limiting returns the uniform 429 RATE_LIMITED envelope', async () => {
  for (let round = 0; round < maxRondasSesion; round += 1) {
    advisorRateLimiter.consume('seed-ip', 'session-rate-limited');
  }

  const response = await request(app)
    .post('/api/asesor/ronda')
    .send(body({ sesionId: 'session-rate-limited' }));

  assert.equal(response.status, 429);
  assert.deepEqual(response.body, {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Advisor rate limit exceeded' },
  });
});

test('provider failures return 503 ADVISOR_UNAVAILABLE without internal details', async () => {
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async () => {
    const failure = new Error('API key leaked at C:\\private\\secret.env');
    failure.providerStatus = 429;
    failure.networkCode = 'ETIMEDOUT';
    throw failure;
  });

  try {
    const response = await request(app).post('/api/asesor/ronda').send(body());

    assert.equal(response.status, 503);
    assert.deepEqual(response.body, {
      success: false,
      error: { code: 'ADVISOR_UNAVAILABLE', message: 'Requirements advisor is unavailable' },
    });
    assert.equal(JSON.stringify(response.body).includes('secret.env'), false);
  } finally {
    restore.mock.restore();
  }
});

test('irrecoverable provider JSON returns 503 ADVISOR_UNAVAILABLE', async () => {
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async () => '{not-json');

  try {
    const response = await request(app).post('/api/asesor/ronda').send(body());

    assert.equal(response.status, 503);
    assert.deepEqual(response.body, {
      success: false,
      error: { code: 'ADVISOR_UNAVAILABLE', message: 'Requirements advisor is unavailable' },
    });
  } finally {
    restore.mock.restore();
  }
});
