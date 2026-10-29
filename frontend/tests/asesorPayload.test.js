import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAdvisorProjectPayload } from '../src/utils/asesorPayload.js'

const finalData = {
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
    infoAdicional: 'Integrar lectores de código de barras.',
  },
}

const initialData = {
  funcionalidades: ['Gestión de ventas', 'Gestión de stock'],
  otraFuncionalidad: '',
  otrasFuncionalidades: [],
  plataformas: ['Web'],
  tiposUsuario: ['Administrador'],
  tiposUsuarioOtro: '',
  cantidadUsuarios: '10 - 50',
  procesoActual: 'Las ventas se registran manualmente en un cuaderno.',
  tipoProyecto: 'gestion',
}

const histories = [
  {
    id: 'hu-1',
    texto: 'Como vendedor, quiero registrar ventas, para actualizar el stock.',
    estado: 'entendida',
    bloqueada: false,
    etapa: '1',
    aDetallar: false,
    funcionalidad: 'Gestión de ventas',
  },
  {
    id: 'hu-2',
    texto: 'Como encargado, quiero controlar stock, para evitar faltantes.',
    estado: 'entendida',
    bloqueada: false,
    etapa: '2',
    aDetallar: false,
    funcionalidad: 'Gestión de stock',
  },
]

function build(overrides = {}) {
  return buildAdvisorProjectPayload({
    idea: 'Una ferretería necesita ordenar ventas y stock.',
    initialData,
    histories,
    answers: [],
    objectives: [{ texto: 'Reducir errores de carga', basadoEn: 'registran manualmente' }],
    acceptedSuggestions: [],
    rejectedSuggestions: [],
    complete: true,
    rounds: 3,
    withoutAdvisor: false,
    finalData,
    ...overrides,
  })
}

test('maps advisor state to the existing project shape with advisor version 2', () => {
  const payload = build()

  assert.deepEqual(payload.proyecto, { tipoProyecto: 'gestion' })
  assert.deepEqual(payload.problema, {
    problemaActual: 'Una ferretería necesita ordenar ventas y stock.',
    procesoActual: initialData.procesoActual,
    objetivos: ['Reducir errores de carga'],
    objetivosOtro: '',
  })
  assert.deepEqual(payload.funcionalidades, {
    seleccionadas: ['Gestión de ventas', 'Gestión de stock'],
    otra: '',
  })
  assert.deepEqual(payload.alcance, {
    plataformas: ['Web'],
    cantidadUsuarios: '10 - 50',
    necesitaTiposUsuario: 'Sí',
    tiposUsuario: ['Administrador'],
    tiposUsuarioOtro: '',
  })
  assert.equal(payload.asesoramiento.version, 2)
  assert.deepEqual(payload.asesoramiento.objetivos, [
    { texto: 'Reducir errores de carga', basadoEn: 'registran manualmente' },
  ])
  assert.equal(payload.asesoramiento.procesoActual, initialData.procesoActual)
  assert.equal(payload.asesoramiento.tipoInferido, false)
})

test('allows an advised payload without inferred objectives', () => {
  const payload = build({ objectives: [] })
  assert.deepEqual(payload.problema.objetivos, [])
  assert.deepEqual(payload.asesoramiento.objetivos, [])
  assert.equal(payload.asesoramiento.sinAsesor, false)
})

test('builds the same shape without advisor and infers an unspecified project type', () => {
  const payload = build({
    initialData: { ...initialData, tipoProyecto: 'no_estoy_seguro' },
    histories: [],
    objectives: [],
    withoutAdvisor: true,
  })

  assert.equal(payload.proyecto.tipoProyecto, 'personalizada')
  assert.equal(payload.asesoramiento.tipoInferido, true)
  assert.equal(payload.asesoramiento.sinAsesor, true)
  assert.deepEqual(payload.problema.objetivos, [])
  assert.deepEqual(payload.funcionalidades.seleccionadas, initialData.funcionalidades)
})

test('removes an initially selected functionality when its current story was deleted', () => {
  const payload = build({ histories: [histories[0]] })
  assert.deepEqual(payload.funcionalidades.seleccionadas, ['Gestión de ventas'])
})
