import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAdvisorProjectPayload } from '../src/utils/asesorPayload.js'

test('maps advisor state to the existing project contract without inventing legacy fields', () => {
  const payload = buildAdvisorProjectPayload({
    idea: 'Una ferretería necesita ordenar ventas y stock.',
    initialData: {
      funcionalidades: ['Gestión de stock', 'Otra'],
      otraFuncionalidad: 'Control de garantías',
      plataformas: ['Web'],
      tiposUsuario: ['Administrador'],
      cantidadUsuarios: '10 - 50',
    },
    histories: [
      {
        id: 'hu-1',
        texto:
          'Como vendedor, quiero registrar ventas, para actualizar el stock.',
        estado: 'entendida',
        bloqueada: false,
        etapa: '1',
        aDetallar: false,
        funcionalidad: 'Gestión de stock',
      },
    ],
    answers: [
      {
        preguntaId: 'q-1',
        historiaId: 'hu-1',
        aspecto: 'volumen',
        pregunta: '¿Cuántas ventas realizan?',
        respuesta: 'Cien por día',
        noSabe: false,
        integrada: true,
      },
    ],
    acceptedSuggestions: ['Agregar alertas de stock'],
    rejectedSuggestions: ['Agregar pagos en criptomonedas'],
    complete: true,
    rounds: 3,
    withoutAdvisor: false,
    finalData: {
      empresa: {
        nombreEmpresa: 'Ferretería Norte',
        contacto: 'Ana Pérez',
        email: 'ana@example.com',
        telefono: '3810000000',
        rubro: 'Comercio',
        rubroOtro: '',
      },
      proyecto: { tipoProyecto: 'gestion' },
      problema: {
        procesoActual: 'Se registra en planillas.',
        objetivos: ['Reducir errores'],
        objetivosOtro: '',
      },
      presupuesto: {
        presupuesto: 'USD 1.000 - 5.000',
        plazo: '3 - 6 meses',
        infoAdicional: 'Integrar lectores de código de barras.',
      },
    },
  })

  assert.deepEqual(payload.funcionalidades, {
    seleccionadas: ['Gestión de stock', 'Otra'],
    otra: 'Control de garantías',
  })
  assert.deepEqual(payload.alcance, {
    plataformas: ['Web'],
    cantidadUsuarios: '10 - 50',
    necesitaTiposUsuario: 'Sí',
    tiposUsuario: ['Administrador'],
    tiposUsuarioOtro: '',
  })
  assert.equal(
    payload.problema.problemaActual,
    'Una ferretería necesita ordenar ventas y stock.'
  )
  assert.deepEqual(payload.asesoramiento, {
    version: 1,
    ideaOriginal: 'Una ferretería necesita ordenar ventas y stock.',
    historias: [
      {
        id: 'hu-1',
        texto:
          'Como vendedor, quiero registrar ventas, para actualizar el stock.',
        estado: 'entendida',
        etapa: '1',
        aDetallar: false,
        funcionalidad: 'Gestión de stock',
      },
    ],
    respuestas: [
      {
        historiaId: 'hu-1',
        aspecto: 'volumen',
        pregunta: '¿Cuántas ventas realizan?',
        respuesta: 'Cien por día',
        noSabe: false,
      },
    ],
    sugerencias: {
      aceptadas: ['Agregar alertas de stock'],
      rechazadas: ['Agregar pagos en criptomonedas'],
    },
    completo: true,
    rondas: 3,
    sinAsesor: false,
  })
})
