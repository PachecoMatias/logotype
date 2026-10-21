import assert from 'node:assert/strict';
import test from 'node:test';

import { companyContext } from '../../src/config/company-context.js';
import { calcularSenales } from '../../src/services/viability-signals.js';
import { createAdvisorContext } from '../fixtures/proyecto-payload.js';

function payload(overrides = {}) {
  return {
    empresa: { rubro: 'Comercio' },
    proyecto: { tipoProyecto: 'web' },
    problema: {
      problemaActual: 'A'.repeat(40),
      procesoActual: 'B'.repeat(40),
    },
    funcionalidades: { seleccionadas: ['Catálogo'] },
    alcance: { plataformas: ['Web'], cantidadUsuarios: '10 - 50' },
    presupuesto: {
      presupuesto: 'USD 1.000 - 5.000',
      plazo: '1 - 3 meses',
      infoAdicional: 'El alcance está priorizado.',
    },
    ...overrides,
  };
}

test('maps every requested deadline range and compatibility', () => {
  const cases = [
    ['Lo antes posible', [0, 4], 'ajustado'],
    ['1 - 3 meses', [4, 13], 'si'],
    ['3 - 6 meses', [13, 26], 'si'],
    ['Más de 6 meses', [26, null], 'si'],
    ['No tenemos una fecha definida', null, null],
  ];

  for (const [plazo, expectedRange, expectedCompatibility] of cases) {
    const result = calcularSenales(
      payload({ presupuesto: { ...payload().presupuesto, plazo } }),
      companyContext,
    );
    assert.deepEqual(result.plazo_solicitado_semanas, expectedRange);
    assert.equal(result.plazo_compatible, expectedCompatibility);
  }
});

test('maps every requested budget range and compatibility', () => {
  const cases = [
    ['Menos de USD 1.000', [0, 1000], 'no'],
    ['USD 1.000 - 5.000', [1000, 5000], 'ajustado'],
    ['USD 5.000 - 10.000', [5000, 10000], 'si'],
    ['Más de USD 10.000', [10000, null], 'si'],
    ['Todavía no lo definimos', null, null],
  ];

  for (const [presupuesto, expectedRange, expectedCompatibility] of cases) {
    const result = calcularSenales(
      payload({ presupuesto: { ...payload().presupuesto, presupuesto } }),
      companyContext,
    );
    assert.deepEqual(result.presupuesto_solicitado_usd, expectedRange);
    assert.equal(result.presupuesto_compatible, expectedCompatibility);
  }
});

test('selects the largest size implied by functionality and platform counts', () => {
  const cases = [
    [6, 1, 'chico', [4, 8]],
    [7, 1, 'mediano', [8, 16]],
    [1, 3, 'grande', [16, 32]],
    [13, 1, 'grande', [16, 32]],
  ];

  for (const [featureCount, platformCount, size, duration] of cases) {
    const result = calcularSenales(
      payload({
        funcionalidades: {
          seleccionadas: Array.from({ length: featureCount }, (_, index) => `F${index}`),
        },
        alcance: {
          cantidadUsuarios: 'Más de 500',
          plataformas: Array.from({ length: platformCount }, (_, index) => `P${index}`),
        },
      }),
      companyContext,
    );
    assert.equal(result.tamano_estimado, size);
    assert.deepEqual(result.duracion_referencia_semanas, duration);
    assert.equal(result.escala_usuarios, 'Más de 500');
  }
});

test('detects sensitive functions, industries, security review, and off-focus platforms', () => {
  const result = calcularSenales(
    payload({
      empresa: { rubro: 'Salud' },
      funcionalidades: {
        seleccionadas: ['Login y autenticación', 'API', 'Reportes'],
      },
      alcance: { plataformas: ['Web', 'Android', 'iOS'], cantidadUsuarios: '50 - 200' },
    }),
    companyContext,
  );

  assert.deepEqual(result.funcionalidades_sensibles, ['Login y autenticación', 'API']);
  assert.equal(result.rubro_sensible, true);
  assert.equal(result.requiere_revision_seguridad, true);
  assert.deepEqual(result.plataformas_fuera_de_foco, ['Android', 'iOS']);
});

test('reports short or empty narrative fields and tolerates incomplete payloads', () => {
  const result = calcularSenales(
    payload({
      problema: { problemaActual: '  breve  ', procesoActual: '' },
      presupuesto: { presupuesto: 'desconocido', plazo: 'desconocido', infoAdicional: '   ' },
      proyecto: { tipoProyecto: 'desconocido' },
    }),
    companyContext,
  );

  assert.deepEqual(result.campos_vacios, ['problemaActual', 'procesoActual', 'infoAdicional']);
  assert.equal(result.presupuesto_minimo_referencia_usd, null);
  assert.equal(result.presupuesto_compatible, null);
  assert.equal(result.plazo_compatible, null);

  assert.doesNotThrow(() => calcularSenales(undefined, undefined));
  assert.deepEqual(calcularSenales(undefined, undefined), {
    cantidad_funcionalidades: 0,
    cantidad_plataformas: 0,
    escala_usuarios: null,
    tamano_estimado: 'chico',
    duracion_referencia_semanas: [0, 0],
    plazo_solicitado_semanas: null,
    plazo_compatible: null,
    presupuesto_solicitado_usd: null,
    presupuesto_minimo_referencia_usd: null,
    presupuesto_compatible: null,
    funcionalidades_sensibles: [],
    rubro_sensible: false,
    requiere_revision_seguridad: false,
    plataformas_fuera_de_foco: [],
    campos_vacios: ['problemaActual', 'procesoActual', 'infoAdicional'],
  });
});

test('does not infer deadline compatibility without a duration reference', () => {
  const result = calcularSenales({ presupuesto: { plazo: '1 - 3 meses' } }, {});

  assert.deepEqual(result.plazo_solicitado_semanas, [4, 13]);
  assert.deepEqual(result.duracion_referencia_semanas, [0, 0]);
  assert.equal(result.plazo_compatible, null);
});

test('adds deterministic advisor-story totals only when advisor context exists', () => {
  const legacySignals = calcularSenales(payload(), companyContext);
  const advisorSignals = calcularSenales(
    payload({ asesoramiento: createAdvisorContext() }),
    companyContext,
  );

  assert.equal(Object.hasOwn(legacySignals, 'historias_asesor_total'), false);
  assert.equal(advisorSignals.historias_asesor_total, 2);
  assert.equal(advisorSignals.historias_asesor_supuesta, 1);
  assert.equal(advisorSignals.historias_asesor_a_detallar, 1);
});
