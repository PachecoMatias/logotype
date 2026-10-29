import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
      procesoActual: 'Las ventas se registran manualmente en un cuaderno.',
    },
    objetivos: [],
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
    refinadas: [],
    preguntas: [
      {
        aspecto: 'quien_la_usa',
        tipo: 'opcion',
        texto: '¿Quién registra las ventas habitualmente?',
        opciones: ['Vendedor', 'Administrador'],
      },
      {
        aspecto: 'beneficio',
        tipo: 'texto',
        texto: '¿Qué resultado esperás al registrar las ventas?',
        opciones: [],
      },
      {
        aspecto: 'comportamiento',
        tipo: 'texto',
        texto: '¿Qué pasos seguís para registrar cada venta?',
        opciones: [],
      },
      {
        aspecto: 'datos_previos',
        tipo: 'texto',
        texto: '¿Qué información de los productos ya tenés?',
        opciones: [],
      },
    ],
    sugerencias: [
      {
        tipo: 'complementaria',
        texto: '¿Querés identificar las ventas anuladas?',
        basado_en: 'registrar ventas',
        funcionalidad: 'Ventas anuladas',
        descripcion: 'Identificar las ventas anuladas.',
      },
    ],
    objetivos: [
      {
        texto: 'Reducir errores al registrar ventas',
        basado_en: 'registrar ventas',
      },
    ],
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
    assert.equal(response.body.data.historias.length, 2);
    assert.deepEqual(
      response.body.data.historias.map(({ funcionalidad }) => funcionalidad),
      ['Gestión de ventas', 'Gestión de stock'],
    );
    assert.equal(response.body.data.historias[0].origen, 'cliente');
    assert.equal(response.body.data.historias[0].estado, 'en_detalle');
    assert.match(response.body.data.historias[0].texto, /gestión de ventas/i);
    assert.equal(
      response.body.data.historias[1].texto,
      'Como usuario, quiero usar gestión de stock, para facilitar mi trabajo.',
    );
    assert.equal(response.body.data.historias[1].estado, 'a_completar');
    assert.equal(response.body.data.historias[1].bloqueada, false);
    assert.equal(response.body.data.historias[1].aDetallar, false);
    assert.deepEqual(response.body.data.foco, {
      historiaId: response.body.data.historias[0].id,
    });
    assert.deepEqual(response.body.data.progreso, {
      detalladas: 2,
      total: 2,
      completas: 0,
      tope: 6,
    });
    assert.equal(response.body.data.preguntas[0].aspecto, 'quien_la_usa');
    assert.equal(response.body.data.sugerencias.length, 1);
    assert.deepEqual(response.body.data.objetivos, [
      { texto: 'Reducir errores al registrar ventas', basadoEn: 'registrar ventas' },
    ]);
    assert.equal(response.body.data.degradado, false);
    assert.equal(response.body.data.motivoDegradado, null);
    assert.equal(response.body.data.completo, false);
    assert.equal(response.body.data.motivoCierre, null);
  } finally {
    restore.mock.restore();
  }
});

test('INICIAL preserves client-owned lifecycle even when provider story state is invalid', async () => {
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
    assert.equal(response.body.data.historias.length, 2);
    assert.equal(response.body.data.historias[0].origen, 'cliente');
    assert.equal(response.body.data.historias[0].estado, 'en_detalle');
  } finally {
    restore.mock.restore();
  }
});

test('CONTINUAR integrates the answered HU and asks only about the next focused HU', async () => {
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
      refinadas: [
        {
          id: 'hu-1',
          texto: 'Como vendedor, quiero registrar ventas, para mantener el stock actualizado',
          estado: 'entendida',
        },
      ],
      preguntas: [
        {
          aspecto: 'beneficio',
          tipo: 'texto',
          texto: '¿Qué mejora espera obtener?',
          opciones: [],
        },
        {
          aspecto: 'comportamiento',
          tipo: 'texto',
          texto: '¿Qué información registrás en cada venta?',
          opciones: [],
        },
        {
          aspecto: 'datos_previos',
          tipo: 'texto',
          texto: '¿Qué información de productos ya tenés?',
          opciones: [],
        },
        {
          aspecto: 'volumen',
          tipo: 'texto',
          texto: '¿Cuántas ventas registrás por día?',
          opciones: [],
        },
      ],
      sugerencias: [
        {
          tipo: 'mejora',
          texto: '¿Querés recibir alertas cuando un producto tenga poco stock?',
          basado_en: 'Gestión de stock',
          funcionalidad: 'Alertas de stock',
          descripcion: 'Recibir alertas cuando un producto tenga poco stock.',
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
            historias: [
              story({ estado: 'en_detalle' }),
              story({ id: 'hu-2', estado: 'a_completar', funcionalidad: 'Gestión de stock' }),
            ],
            respuestas: [answer('quien_la_usa')],
          }),
        }),
      );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.preguntas[0].aspecto, 'quien_la_usa');
    assert.equal(response.body.data.historias[0].id, 'hu-1');
    assert.deepEqual(response.body.data.foco, { historiaId: 'hu-2' });
    assert.deepEqual(response.body.data.integradas, ['q-quien_la_usa']);
  } finally {
    restore.mock.restore();
  }
});

test('INICIAL to CONTINUAR completes HU1 and advances to HU2 without a second HU1 batch', async () => {
  const providerResponses = [
    providerResult(),
    providerResult({
      refinadas: [
        {
          id: '',
          texto: 'Como vendedor, quiero registrar ventas, para mantener el stock actualizado',
          estado: 'entendida',
        },
      ],
      sugerencias: [
        {
          tipo: 'mejora',
          texto: '¿Querés recibir alertas cuando un producto tenga poco stock?',
          basado_en: 'Gestión de stock',
          funcionalidad: 'Alertas de stock',
          descripcion: 'Recibir alertas cuando un producto tenga poco stock.',
        },
      ],
      preguntas: [
        {
          aspecto: 'beneficio',
          tipo: 'texto',
          texto: '¿Qué resultado concreto esperás obtener?',
          opciones: [],
        },
        {
          aspecto: 'comportamiento',
          tipo: 'texto',
          texto: '¿Qué pasos necesitás registrar durante una venta?',
          opciones: [],
        },
        {
          aspecto: 'datos_previos',
          tipo: 'texto',
          texto: '¿Qué datos de productos ya están disponibles?',
          opciones: [],
        },
        {
          aspecto: 'volumen',
          tipo: 'texto',
          texto: '¿Cuántas operaciones esperás registrar por día?',
          opciones: [],
        },
      ],
    }),
  ];
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async () =>
    providerResponses.shift(),
  );

  try {
    const initialResponse = await request(app)
      .post('/api/asesor/ronda')
      .send(body({ sesionId: 'session-continuation-regression' }));
    const initialRound = initialResponse.body.data;
    const initialFocusId = initialRound.foco.historiaId;

    assert.equal(initialResponse.status, 200);
    assert.equal(initialRound.historias.length, 2);
    assert.deepEqual(initialRound.foco, { historiaId: initialRound.historias[0].id });
    assert.equal(initialRound.progreso.completas, 0);
    assert.equal(initialRound.completo, false);
    assert.equal(initialRound.motivoCierre, null);

    const continuationResponse = await request(app)
      .post('/api/asesor/ronda')
      .send(
        body({
          sesionId: 'session-continuation-regression',
          estado: state({
            historias: initialRound.historias,
            respuestas: initialRound.preguntas.map((question) => ({
              preguntaId: question.id,
              historiaId: initialFocusId,
              aspecto: question.aspecto,
              pregunta: question.texto,
              respuesta: 'Respuesta confirmada por el cliente.',
              noSabe: false,
              integrada: false,
            })),
          }),
        }),
      );
    const continuationRound = continuationResponse.body.data;

    assert.equal(continuationResponse.status, 200);
    assert.deepEqual(continuationRound.foco, {
      historiaId: continuationRound.historias[1].id,
    });
    assert.equal(continuationRound.historias[0].id, initialFocusId);
    assert.equal(continuationRound.historias[0].estado, 'entendida');
    assert.equal(continuationRound.historias[1].estado, 'en_detalle');
    assert.deepEqual(
      continuationRound.historias.map(({ funcionalidad }) => funcionalidad),
      ['Gestión de ventas', 'Gestión de stock'],
    );
    assert.equal(continuationRound.progreso.completas, 1);
    assert.equal(continuationRound.completo, false);
    assert.equal(continuationRound.motivoCierre, null);
    assert.deepEqual(
      continuationRound.integradas,
      initialRound.preguntas.map(({ id }) => id),
    );
    assert.deepEqual(
      continuationRound.preguntas.map(({ aspecto }) => aspecto),
      ['quien_la_usa', 'beneficio', 'comportamiento', 'datos_previos'],
    );
  } finally {
    restore.mock.restore();
  }
});

test('CONTINUAR preserves the provider refinement of the answered story after focus advances', async () => {
  const originalSalesText =
    'Como la persona de la librería, quiero registrar las ventas, para tener un control claro de los ingresos';
  const refinedSalesText =
    'Como empleado de la librería, quiero registrar cada venta con productos, cantidades, precios y total, para mantener un control claro de los ingresos';
  const stockText =
    'Como la persona de la librería, quiero controlar el stock de los libros, para saber qué tengo disponible';
  const prompts = [];
  const providerResponses = [
    providerResult({
      historias: [
        { id: 'hu-1', texto: originalSalesText, estado: 'entendida', etapa: '1' },
        { id: 'hu-2', texto: stockText, estado: 'entendida', etapa: '2' },
      ],
    }),
    providerResult({
      historias: [
        { id: '', texto: refinedSalesText, estado: 'entendida', etapa: '1' },
        { id: 'hu-2', texto: stockText, estado: 'entendida', etapa: '2' },
      ],
      refinadas: [{ id: '', texto: refinedSalesText, estado: 'entendida' }],
      preguntas: [
        {
          aspecto: 'quien_la_usa',
          tipo: 'texto',
          texto: '¿Qué personas consultan el stock disponible?',
          opciones: [],
        },
        {
          aspecto: 'beneficio',
          tipo: 'texto',
          texto: '¿Qué decisión querés mejorar con el stock actualizado?',
          opciones: [],
        },
        {
          aspecto: 'comportamiento',
          tipo: 'texto',
          texto: '¿Qué movimientos necesitás registrar en el stock?',
          opciones: [],
        },
        {
          aspecto: 'datos_previos',
          tipo: 'texto',
          texto: '¿Qué catálogo de productos ya tenés?',
          opciones: [],
        },
      ],
      sugerencias: [
        {
          tipo: 'mejora',
          texto: '¿Querés actualizar el stock al registrar cada venta?',
          basado_en: 'Gestión de stock',
          funcionalidad: 'Actualización de stock',
          descripcion: 'Actualizar el stock al registrar cada venta.',
        },
      ],
    }),
  ];
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async (prompt) => {
    prompts.push(prompt);
    return providerResponses.shift();
  });

  try {
    const initialResponse = await request(app)
      .post('/api/asesor/ronda')
      .send(body({ sesionId: 'session-refinement-regression' }));
    const initialRound = initialResponse.body.data;
    const initialFocusId = initialRound.foco.historiaId;
    const completedSalesAnswers = [
      ['quien_la_usa', 'Empleados y administrador'],
      ['beneficio', 'Mantener un control claro de los ingresos'],
      ['comportamiento', 'Registrar productos, cantidades, precios y total'],
      ['datos_previos', 'Productos, cantidades y precios'],
      ['volumen', 'Entre 30 y 50 ventas por día'],
      ['restricciones', 'Solo empleados autorizados'],
    ].map(([aspecto, respuesta]) =>
      answer(aspecto, {
        preguntaId: `pregunta-${aspecto}`,
        historiaId: initialFocusId,
        pregunta: `Pregunta contextual sobre ${aspecto}`,
        respuesta,
      }),
    );

    const continuationResponse = await request(app)
      .post('/api/asesor/ronda')
      .send(
        body({
          sesionId: 'session-refinement-regression',
          estado: state({
            historias: initialRound.historias,
            respuestas: completedSalesAnswers,
          }),
        }),
      );
    const continuationRound = continuationResponse.body.data;

    assert.equal(continuationResponse.status, 200);
    assert.equal(continuationRound.historias[0].texto, refinedSalesText);
    assert.match(continuationRound.historias[1].texto, /gestión de stock/i);
    assert.deepEqual(continuationRound.foco, {
      historiaId: continuationRound.historias[1].id,
    });
    assert.deepEqual(
      continuationRound.preguntas.map(({ texto }) => texto),
      [
        '¿Qué personas consultan el stock disponible?',
        '¿Qué decisión querés mejorar con el stock actualizado?',
        '¿Qué movimientos necesitás registrar en el stock?',
        '¿Qué catálogo de productos ya tenés?',
      ],
    );
    assert.equal(continuationRound.historias.length, 2);
    assert.equal(continuationRound.sugerencias.length, 1);
    assert.match(continuationRound.sugerencias[0].texto, /actualizar el stock/i);
    assert.deepEqual(
      continuationRound.integradas,
      completedSalesAnswers.map(({ preguntaId }) => preguntaId),
    );
    assert.match(prompts[1], new RegExp(`HISTORIAS_REFINABLES_JSON\\n\\["${initialFocusId}"\\]`));
    assert.match(prompts[1], /Para cada elemento de A_REFINAR/);
    assert.match(prompts[1], /SUGERENCIAS_PERMITIDAS: true/);
    assert.match(prompts[1], /"integrada":false/);
  } finally {
    restore.mock.restore();
  }
});

test('CONTINUAR accepts a valid AIADV-19 HU1 to HU2 transition in one provider attempt', async () => {
  const fixture = await readFile(
    new URL('../fixtures/advisor-valid-hu-transition.json', import.meta.url),
    'utf8',
  );
  let calls = 0;
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async () => {
    calls += 1;
    return fixture;
  });
  const historias = [
    story({
      texto: 'Como usuario, quiero usar gestión de ventas, para facilitar mi trabajo.',
      estado: 'en_detalle',
    }),
    story({
      id: 'hu-2',
      texto: 'Como usuario, quiero usar gestión de stock, para facilitar mi trabajo.',
      estado: 'a_completar',
      etapa: '2',
      funcionalidad: 'Gestión de stock',
    }),
  ];
  const respuestas = [
    ['quien_la_usa', 'Vendedor; Administrador'],
    ['beneficio', 'Agilizar la atención; Actualizar el stock'],
    ['comportamiento', 'Cobrar con efectivo; Tarjeta; Transferencia'],
    ['datos_previos', 'Catálogo de productos y medios de pago'],
    ['volumen', 'Entre 30 y 50 ventas por día'],
    ['restricciones', 'Solo vendedores y administradores autorizados'],
  ].map(([aspecto, respuesta]) =>
    answer(aspecto, {
      preguntaId: `hu1-${aspecto}`,
      respuesta,
    }),
  );

  try {
    const response = await request(app)
      .post('/api/asesor/ronda')
      .send(
        body({
          sesionId: 'valid-hu1-hu2-transition',
          estado: state({ historias, respuestas }),
        }),
      );

    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    assert.equal(
      response.body.data.historias[0].texto,
      'Como vendedor o administrador, quiero registrar ventas cobrando con distintos medios, para agilizar la atención y actualizar el stock automáticamente.',
    );
    assert.equal(response.body.data.historias[0].estado, 'entendida');
    assert.deepEqual(
      response.body.data.integradas,
      respuestas.map(({ preguntaId }) => preguntaId),
    );
    assert.deepEqual(response.body.data.foco, { historiaId: 'hu-2' });
    assert.equal(response.body.data.preguntas.length, 5);
    assert.ok(response.body.data.preguntas.every(({ origen }) => origen === 'ia'));
    assert.deepEqual(response.body.data.preguntas[0].opciones, ['Vendedor', 'Administrador']);
    assert.equal(response.body.data.preguntas[0].seleccion, 'multiple');
    assert.equal(response.body.data.degradado, false);
    assert.equal(response.body.data.motivoDegradado, null);
  } finally {
    restore.mock.restore();
  }
});

test('CONTINUAR focuses an accepted IA suggestion without requiring its refinement', async () => {
  const prompts = [];
  const refinedStockText =
    'Como vendedor, quiero mantener el stock actualizado con cada movimiento, para conocer la disponibilidad real.';
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async (prompt) => {
    prompts.push(prompt);
    return providerResult({
      refinadas: [{ id: 'hu-2', texto: refinedStockText, estado: 'entendida' }],
      preguntas: [
        {
          aspecto: 'quien_la_usa',
          tipo: 'opcion',
          seleccion: 'multiple',
          texto: '¿Quiénes necesitan emitir o consultar las facturas?',
          opciones: ['Vendedor', 'Administrador'],
        },
        {
          aspecto: 'beneficio',
          tipo: 'texto',
          seleccion: 'unica',
          texto: '¿Qué resultado esperás al asociar una factura con cada venta?',
          opciones: [],
        },
        {
          aspecto: 'comportamiento',
          tipo: 'texto',
          seleccion: 'unica',
          texto: '¿Qué debería ocurrir al confirmar una venta facturada?',
          opciones: [],
        },
        {
          aspecto: 'datos_previos',
          tipo: 'texto',
          seleccion: 'unica',
          texto: '¿Qué datos de facturación ya registrás?',
          opciones: [],
        },
      ],
      sugerencias: [
        {
          tipo: 'mejora',
          texto: '¿Querés distinguir las facturas anuladas de las vigentes?',
          basado_en: 'Facturación',
          funcionalidad: 'Estados de factura',
          descripcion: 'Distinguir facturas anuladas y vigentes.',
        },
      ],
    });
  });
  const historias = [
    story({ estado: 'entendida' }),
    story({
      id: 'hu-2',
      texto: 'Como usuario, quiero usar gestión de stock, para facilitar mi trabajo.',
      estado: 'en_detalle',
      etapa: '2',
      funcionalidad: 'Gestión de stock',
    }),
    story({
      id: 'hu-ia-3',
      texto: 'Agregar facturación asociada a la gestión de ventas.',
      origen: 'ia',
      estado: 'a_completar',
      etapa: '3',
      funcionalidad: 'Facturación',
    }),
  ];
  const respuestas = [
    ['quien_la_usa', 'Vendedor; Administrador'],
    ['beneficio', 'Conocer la disponibilidad real'],
    ['comportamiento', 'Actualizar con ventas, compras y ajustes'],
    ['datos_previos', 'Catálogo y cantidades actuales'],
    ['volumen', 'Cien movimientos por día'],
    ['restricciones', 'Solo personal autorizado'],
  ].map(([aspecto, respuesta]) =>
    answer(aspecto, {
      preguntaId: `hu2-${aspecto}`,
      historiaId: 'hu-2',
      respuesta,
    }),
  );

  try {
    const response = await request(app)
      .post('/api/asesor/ronda')
      .send(
        body({
          sesionId: 'accepted-ia-suggestion-transition',
          estado: state({ historias, respuestas }),
        }),
      );

    assert.equal(response.status, 200);
    assert.equal(prompts.length, 1);
    assert.equal(response.body.data.historias[1].texto, refinedStockText);
    assert.deepEqual(
      response.body.data.integradas,
      respuestas.map(({ preguntaId }) => preguntaId),
    );
    assert.deepEqual(response.body.data.foco, { historiaId: 'hu-ia-3' });
    assert.equal(response.body.data.historias[2].origen, 'ia');
    assert.equal(response.body.data.historias[2].estado, 'en_detalle');
    assert.equal(response.body.data.historias[2].funcionalidad, 'Facturación');
    assert.equal(
      response.body.data.historias[2].texto,
      'Agregar facturación asociada a la gestión de ventas.',
    );
    assert.equal(response.body.data.preguntas.length, 4);
    assert.equal(response.body.data.degradado, false);
    assert.equal(response.body.data.motivoDegradado, null);
    assert.match(prompts[0], /FOCO_JSON\n\{"historiaId":"hu-ia-3"\}/);
    assert.match(prompts[0], /HISTORIAS_REFINABLES_JSON\n\["hu-2"\]/);
    assert.match(
      prompts[0],
      /"historiaEnFoco":\{"id":"hu-ia-3","texto":"Agregar facturación asociada a la gestión de ventas\.","origen":"ia","estado":"en_detalle"/,
    );
    assert.equal(prompts[0].includes('¿Querés agregar'), false);
    const untrusted = JSON.parse(
      prompts[0]
        .split('BEGIN_UNTRUSTED_ADVISOR_STATE_JSON\n')[1]
        .split('\nEND_UNTRUSTED_ADVISOR_STATE_JSON')[0],
    );
    assert.deepEqual(
      untrusted.A_REFINAR.map(({ id }) => id),
      ['hu-2'],
    );
  } finally {
    restore.mock.restore();
  }
});

test('secondary noSabe cannot promote an answered HU to supuesta', async () => {
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async () =>
    providerResult({
      refinadas: [
        {
          id: 'hu-1',
          texto: story().texto,
          estado: 'supuesta',
        },
      ],
      sugerencias: [
        {
          tipo: 'mejora',
          texto: '¿Querés recibir alertas cuando un producto tenga poco stock?',
          basado_en: 'Gestión de stock',
          funcionalidad: 'Alertas de stock',
          descripcion: 'Recibir alertas cuando un producto tenga poco stock.',
        },
      ],
    }),
  );

  try {
    const response = await request(app)
      .post('/api/asesor/ronda')
      .send(
        body({
          sesionId: 'secondary-nosabe',
          estado: state({
            historias: [
              story({ estado: 'en_detalle' }),
              story({
                id: 'hu-2',
                estado: 'a_completar',
                funcionalidad: 'Gestión de stock',
              }),
            ],
            respuestas: [answer('volumen', { respuesta: '', noSabe: true })],
          }),
        }),
      );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.historias[0].estado, 'con_pendientes');
    assert.deepEqual(response.body.data.foco, { historiaId: 'hu-2' });
  } finally {
    restore.mock.restore();
  }
});

test.skip('legacy two-batch flow is replaced by one complete batch per HU', async () => {
  const initialSalesText =
    'Como empleado, quiero registrar las ventas del día, para controlar lo que se vende.';
  const refinedSalesText =
    'Como empleado, quiero registrar ventas con productos, cantidades y total, para controlar lo vendido cada día.';
  const stockText =
    'Como encargado, quiero controlar el stock disponible, para saber qué productos puedo vender.';
  const refinedStockText =
    'Como encargado, quiero registrar entradas y salidas de stock, para conocer la disponibilidad actualizada.';
  const question = (aspecto, texto, overrides = {}) => ({
    aspecto,
    tipo: 'texto',
    texto,
    opciones: [],
    ...overrides,
  });
  const responses = [
    providerResult({
      historias: [
        { id: 'hu-1', texto: initialSalesText, estado: 'entendida', etapa: '1' },
        { id: 'hu-2', texto: stockText, estado: 'entendida', etapa: '2' },
      ],
      preguntas: [
        question('quien_la_usa', '¿Quién registra las ventas?', {
          tipo: 'multiple_choice',
          opciones: ['Empleado', 'Encargado'],
        }),
        question('beneficio', '¿Qué necesitás controlar?', {
          tipo: 'multiple_choice',
          opciones: ['Ingresos', 'Productos'],
        }),
        question('comportamiento', '¿Qué datos registrás de cada venta?', {
          tipo: 'multiple_choice',
          opciones: ['Productos', 'Cantidades'],
        }),
        question('datos_previos', '¿Qué información ya tenés disponible?', {
          tipo: 'multiple_choice',
          opciones: ['Catálogo', 'Ninguna'],
        }),
      ],
    }),
    providerResult({
      historias: [
        { id: 'hu-1', texto: initialSalesText, estado: 'entendida', etapa: '1' },
        { id: 'hu-2', texto: stockText, estado: 'entendida', etapa: '2' },
      ],
      refinadas: [{ id: 'hu-1', texto: initialSalesText }],
      preguntas: [
        question('volumen', '¿Cuántas ventas registrás por día?'),
        question('restricciones', '¿Quién puede modificar una venta?'),
      ],
    }),
    providerResult({
      historias: [
        {
          id: 'hu-1',
          texto: refinedSalesText,
          estado: 'entendida',
          etapa: '1',
        },
        { id: 'hu-2', texto: stockText, estado: 'entendida', etapa: '2' },
      ],
      refinadas: [{ id: '', texto: refinedSalesText, extra: 'ignored' }],
      preguntas: [
        question('quien_la_usa', '¿Quién consulta el stock disponible?'),
        question('beneficio', '¿Qué decisión mejora con el stock actualizado?'),
        question('comportamiento', '¿Qué movimientos modifican el stock?'),
        question('datos_previos', '¿Qué catálogo de productos ya existe?'),
      ],
    }),
  ];
  responses.push(
    providerResult({
      historias: [
        { id: 'hu-1', texto: refinedSalesText, estado: 'entendida', etapa: '1' },
        { id: 'hu-2', texto: refinedStockText, estado: 'entendida', etapa: '2' },
      ],
      refinadas: [{ id: 'hu-2', texto: refinedStockText }],
      preguntas: [
        question('volumen', '¿Cuántos movimientos de stock registrás por día?'),
        question('restricciones', '¿Quién puede corregir el stock disponible?'),
      ],
    }),
  );
  responses.push(
    providerResult({
      historias: [
        { id: 'hu-1', texto: refinedSalesText, estado: 'entendida', etapa: '1' },
        { id: 'hu-2', texto: refinedStockText, estado: 'entendida', etapa: '2' },
      ],
      refinadas: [{ id: 'hu-2', texto: refinedStockText }],
      preguntas: [],
    }),
  );
  const prompts = [];
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async (prompt) => {
    prompts.push(prompt);
    return responses.shift();
  });

  try {
    const initial = await request(app)
      .post('/api/asesor/ronda')
      .send(body({ sesionId: 'session-two-answer-batches' }));
    assert.equal(initial.body.data.degradado, false);
    assert.ok(initial.body.data.preguntas.filter(({ origen }) => origen === 'ia').length >= 2);
    const firstAnswers = [
      ['quien_la_usa', 'Empleado'],
      ['beneficio', 'Controlar lo vendido'],
      ['comportamiento', 'Productos, cantidades y total'],
      ['datos_previos', 'Catálogo de productos'],
    ].map(([aspecto, respuesta]) =>
      answer(aspecto, {
        preguntaId: `primera-${aspecto}`,
        respuesta,
      }),
    );
    const second = await request(app)
      .post('/api/asesor/ronda')
      .send(
        body({
          sesionId: 'session-two-answer-batches',
          estado: state({ historias: initial.body.data.historias, respuestas: firstAnswers }),
        }),
      );
    const secondAnswers = [
      answer('volumen', { preguntaId: 'segunda-volumen', respuesta: '40 ventas por día' }),
      answer('restricciones', {
        preguntaId: 'segunda-restricciones',
        respuesta: 'Solo supervisores',
      }),
    ];
    const third = await request(app)
      .post('/api/asesor/ronda')
      .send(
        body({
          sesionId: 'session-two-answer-batches',
          estado: state({
            historias: second.body.data.historias,
            respuestas: [
              ...firstAnswers.map((item) => ({
                ...item,
                integrada: second.body.data.integradas.includes(item.preguntaId),
              })),
              ...secondAnswers,
            ],
          }),
        }),
      );

    assert.deepEqual(
      second.body.data.integradas,
      firstAnswers.map(({ preguntaId }) => preguntaId),
    );
    assert.equal(third.status, 200);
    assert.equal(third.body.data.historias.find(({ id }) => id === 'hu-1').texto, refinedSalesText);
    assert.deepEqual(third.body.data.foco, { historiaId: 'hu-2' });
    assert.deepEqual(
      third.body.data.integradas,
      secondAnswers.map(({ preguntaId }) => preguntaId),
    );
    const firstStockAnswers = [
      ['quien_la_usa', 'Encargado'],
      ['beneficio', 'Conocer disponibilidad'],
      ['comportamiento', 'Registrar entradas y salidas'],
      ['datos_previos', 'Catálogo de productos'],
    ].map(([aspecto, respuesta]) =>
      answer(aspecto, {
        preguntaId: `stock-primera-${aspecto}`,
        historiaId: 'hu-2',
        respuesta,
      }),
    );
    const fourthState = state({
      historias: third.body.data.historias,
      respuestas: [
        ...firstAnswers.map((item) => ({ ...item, integrada: true })),
        ...secondAnswers.map((item) => ({ ...item, integrada: true })),
        ...firstStockAnswers,
      ],
    });
    assert.equal(fourthState.historias[0].texto, refinedSalesText);
    const fourth = await request(app)
      .post('/api/asesor/ronda')
      .send(
        body({
          sesionId: 'session-two-answer-batches',
          estado: fourthState,
        }),
      );
    assert.equal(fourth.status, 200);
    assert.ok(!prompts[3].includes(initialSalesText));
    assert.deepEqual(
      fourth.body.data.integradas,
      firstStockAnswers.map(({ preguntaId }) => preguntaId),
    );
    const secondStockAnswers = [
      answer('volumen', {
        preguntaId: 'stock-segunda-volumen',
        historiaId: 'hu-2',
        respuesta: '100 movimientos por día',
      }),
      answer('restricciones', {
        preguntaId: 'stock-segunda-restricciones',
        historiaId: 'hu-2',
        respuesta: 'Solo encargados',
      }),
    ];
    const fifth = await request(app)
      .post('/api/asesor/ronda')
      .send(
        body({
          sesionId: 'session-two-answer-batches',
          estado: state({
            historias: fourth.body.data.historias,
            respuestas: [
              ...firstAnswers.map((item) => ({ ...item, integrada: true })),
              ...secondAnswers.map((item) => ({ ...item, integrada: true })),
              ...firstStockAnswers.map((item) => ({ ...item, integrada: true })),
              ...secondStockAnswers,
            ],
          }),
        }),
      );
    assert.equal(fifth.status, 200);
    assert.equal(fifth.body.data.completo, true);
    assert.equal(fifth.body.data.historias[1].texto, refinedStockText);
    assert.deepEqual(
      fifth.body.data.integradas,
      secondStockAnswers.map(({ preguntaId }) => preguntaId),
    );
    assert.equal(prompts.length, 5);
  } finally {
    restore.mock.restore();
  }
});

test('missing content uses at most two calls per round and keeps refinement answers pending', async () => {
  let calls = 0;
  const prompts = [];
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async (prompt) => {
    calls += 1;
    prompts.push(prompt);
    return providerResult({ historias: [], refinadas: [], preguntas: [], sugerencias: [] });
  });
  const pending = answer('beneficio', { preguntaId: 'pending-benefit' });

  try {
    const first = await request(app)
      .post('/api/asesor/ronda')
      .send(
        body({
          sesionId: 'session-no-refinement-retry',
          estado: state({ historias: [story()], respuestas: [pending] }),
        }),
      );
    const second = await request(app)
      .post('/api/asesor/ronda')
      .send(
        body({
          sesionId: 'session-no-refinement-retry',
          estado: state({ historias: first.body.data.historias, respuestas: [pending] }),
        }),
      );

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(calls, 2);
    assert.deepEqual(first.body.data.integradas, []);
    assert.deepEqual(second.body.data.integradas, []);
    assert.match(prompts[1], /"preguntaId":"pending-benefit"/);
    assert.match(prompts[1], /"integrada":false/);
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
      .send(
        body({
          estado: state({
            historias: [story()],
            respuestas: completedAnswers,
            objetivos: [
              { texto: 'Mantener el stock actualizado', basadoEn: 'stock actualizado' },
              { texto: 'Organizar una agenda compartida', basadoEn: 'agenda compartida' },
            ],
          }),
        }),
      );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.completo, true);
    assert.equal(response.body.data.motivoCierre, 'completo');
    assert.deepEqual(response.body.data.preguntas, []);
    assert.deepEqual(response.body.data.objetivos, [
      { texto: 'Mantener el stock actualizado', basadoEn: 'stock actualizado' },
    ]);
  } finally {
    restore.mock.restore();
  }
});

test('cerrar=true integrates pending answers without returning questions', async () => {
  let calls = 0;
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async () => {
    calls += 1;
    return providerResult({
      refinadas: [
        {
          id: 'hu-1',
          texto: 'Como vendedor, quiero registrar ventas, para mantener el stock actualizado',
        },
      ],
      preguntas: [],
    });
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
    assert.deepEqual(response.body.data.integradas, ['q-quien_la_usa']);
  } finally {
    restore.mock.restore();
  }
});

test('cerrar=true keeps unrefined answers pending and marks the story with pending details', async () => {
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async () =>
    providerResult({ historias: [], refinadas: [], preguntas: [], sugerencias: [] }),
  );

  try {
    const pendingAnswers = [
      'quien_la_usa',
      'beneficio',
      'comportamiento',
      'datos_previos',
      'volumen',
      'restricciones',
    ].map((aspecto) => answer(aspecto));
    const response = await request(app)
      .post('/api/asesor/ronda')
      .send(
        body({
          cerrar: true,
          estado: state({ historias: [story()], respuestas: pendingAnswers }),
        }),
      );

    assert.equal(response.status, 200);
    assert.equal(response.body.data.completo, true);
    assert.equal(response.body.data.historias[0].estado, 'con_pendientes');
    assert.deepEqual(response.body.data.integradas, []);
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

test('persistent provider rate limits return a degraded round without internal details', async () => {
  let calls = 0;
  const loggedFailures = [];
  const restoreConsole = test.mock.method(console, 'error', (line) => {
    loggedFailures.push(line);
  });
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async () => {
    calls += 1;
    const failure = new Error('API key leaked at C:\\private\\secret.env');
    failure.providerStatus = 429;
    failure.networkCode = 'ETIMEDOUT';
    throw failure;
  });

  try {
    const response = await request(app).post('/api/asesor/ronda').send(body());

    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    assert.equal(response.body.data.degradado, true);
    assert.equal(response.body.data.motivoDegradado, 'rate_limit');
    assert.ok(response.body.data.preguntas.every(({ origen }) => origen === 'respaldo'));
    assert.equal(JSON.stringify(response.body).includes('secret.env'), false);
    assert.equal(loggedFailures.length, 1);
    assert.equal(loggedFailures[0].includes('secret.env'), false);
  } finally {
    restore.mock.restore();
    restoreConsole.mock.restore();
  }
});

test('irrecoverable provider JSON returns a validation-degraded round', async () => {
  const restore = test.mock.method(geminiGateway, 'generateAdvisorRound', async () => '{not-json');

  try {
    const response = await request(app).post('/api/asesor/ronda').send(body());

    assert.equal(response.status, 200);
    assert.equal(response.body.data.degradado, true);
    assert.equal(response.body.data.motivoDegradado, 'validation');
    assert.deepEqual(response.body.data.integradas, []);
  } finally {
    restore.mock.restore();
  }
});
