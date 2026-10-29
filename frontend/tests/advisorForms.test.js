import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { validateAdvisorFinalData } from '../src/components/ProjectConfigurator/validation.js'

let vite

test.before(async () => {
  vite = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })
})

test.after(async () => {
  await vite?.close()
})

test('final advisor form renders only company, contact, budget, and timeline fields', async () => {
  const { default: AdvisorFinalDetails } = await vite.ssrLoadModule(
    '/src/components/ProjectConfigurator/AdvisorFinalDetails.jsx'
  )
  const markup = renderToStaticMarkup(
    React.createElement(AdvisorFinalDetails, {
      finalData: {
        empresa: {
          nombreEmpresa: '',
          contacto: '',
          email: '',
          telefono: '',
          rubro: '',
          rubroOtro: '',
        },
        presupuesto: { presupuesto: '', plazo: '', infoAdicional: '' },
      },
      submitting: false,
      submitError: '',
      onFinalDataChange() {},
      onSubmit() {},
    })
  )

  for (const label of [
    'Nombre de la empresa',
    'Persona de contacto',
    'Email',
    'Teléfono',
    'Rubro',
    'Presupuesto estimado',
    'Plazo esperado',
    'Información adicional',
  ]) {
    assert.match(markup, new RegExp(label))
  }
  for (const removed of [
    'Tipo de solución',
    '¿Cómo realizan este proceso actualmente?',
    'Objetivos principales',
    'Funcionalidades',
    'Plataformas',
    'Cantidad aproximada de usuarios',
    'Tipos de usuarios',
  ]) {
    assert.doesNotMatch(markup, new RegExp(removed.replace(/[?]/g, '\\?')))
  }
})

test('advisor start initially keeps project details closed and mounted with their values', async () => {
  const { default: AdvisorStart } = await vite.ssrLoadModule(
    '/src/components/ProjectConfigurator/AdvisorStart.jsx'
  )
  const markup = renderToStaticMarkup(
    React.createElement(AdvisorStart, {
      idea: 'Ordenar reparaciones del taller',
      data: {
        procesoActual: 'Registramos cada reparación en una planilla.',
        tipoProyecto: 'gestion',
        funcionalidades: ['Gestión de turnos'],
        otraFuncionalidad: '',
        plataformas: ['Web'],
        tiposUsuario: ['Administrador'],
        tiposUsuarioOtro: '',
        cantidadUsuarios: '1 - 10',
      },
      errors: {},
      loading: false,
      onIdeaChange() {},
      onDataChange() {},
      onStart() {},
    })
  )

  assert.match(markup, /aria-expanded="false"/)
  assert.match(markup, /id="adv-project-details"[^>]*aria-hidden="true"/)
  assert.match(markup, /Contanos tu idea/)
  assert.match(markup, /¿Cómo realizan actualmente este proceso\?/)
  assert.match(markup, /Tipo de solución/)
  assert.match(markup, /Funcionalidades que ya imaginás/)
  assert.match(markup, /Gestión de turnos/)
  assert.match(markup, /Administrador/)
  assert.match(markup, /1 - 10/)
})

test('advisor form and administrator summary styles keep focused responsive contracts', async () => {
  const [advisorStyles, panelStyles] = await Promise.all([
    readFile(new URL('../src/styles/advisor.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles/panel.css', import.meta.url), 'utf8'),
  ])

  assert.match(advisorStyles, /\.adv-final :is\(input, textarea, select\)\s*\{[^}]*padding: 13px 14px[^}]*border: 1px solid[^}]*border-radius: 8px/s)
  assert.match(advisorStyles, /\.adv-final select\s*\{[^}]*appearance: none[^}]*background-image: url/s)
  assert.match(advisorStyles, /\.adv-project-details__panel\s*\{[^}]*grid-template-rows: 0fr/s)
  assert.match(advisorStyles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.adv-project-details__panel/)
  assert.match(panelStyles, /\.adm-summary__grid\s*\{[^}]*grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/s)
  assert.match(panelStyles, /\.adm-summary__item--metric-wide\s*\{[^}]*grid-column: span 3/s)
  assert.match(panelStyles, /@media \(max-width: 640px\)[\s\S]*\.adm-summary__grid\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/)
})

test('confirmation renders grounded objectives only when present', async () => {
  const { default: AdvisorConfirmation } = await vite.ssrLoadModule(
    '/src/components/ProjectConfigurator/AdvisorConfirmation.jsx'
  )
  const props = {
    histories: [],
    onConfirm() {},
    onAdjust() {},
  }
  const withObjectives = renderToStaticMarkup(
    React.createElement(AdvisorConfirmation, {
      ...props,
      objectives: [{ texto: 'Reducir errores de carga', basadoEn: 'carga manual' }],
    })
  )
  const withoutObjectives = renderToStaticMarkup(
    React.createElement(AdvisorConfirmation, { ...props, objectives: [] })
  )

  assert.match(withObjectives, /Objetivos que entendimos/)
  assert.match(withObjectives, /Reducir errores de carga/)
  assert.doesNotMatch(withObjectives, /El administrador verá estos objetivos/)
  assert.doesNotMatch(withoutObjectives, /Objetivos que entendimos/)
})

test('reduced final validation checks only company, contact, budget, and timeline fields', () => {
  const errors = validateAdvisorFinalData({
    empresa: {
      nombreEmpresa: '',
      contacto: '',
      email: '',
      telefono: '',
      rubro: '',
      rubroOtro: '',
    },
    presupuesto: { presupuesto: '', plazo: '', infoAdicional: '' },
  })

  assert.deepEqual(Object.keys(errors).sort(), ['empresa', 'presupuesto'])
  assert.ok(errors.empresa.nombreEmpresa)
  assert.ok(errors.empresa.contacto)
  assert.ok(errors.presupuesto.presupuesto)
  assert.ok(errors.presupuesto.plazo)
})

test('admin summary renders new, empty-objective, fallback, and legacy projects without empty rows', async () => {
  const { ResumenProyecto } = await vite.ssrLoadModule(
    '/src/components/Panel/PanelDetalle.jsx'
  )
  const base = {
    empresa: { nombreEmpresa: 'Librería Norte', rubro: 'Comercio' },
    proyecto: { tipoProyecto: 'gestion' },
    problema: {
      problemaActual: 'Errores al registrar ventas.',
      procesoActual: 'Registro manual en planillas.',
      objetivos: ['Reducir errores de carga'],
    },
    funcionalidades: { seleccionadas: ['Gestión de ventas'], otra: '' },
    alcance: {
      plataformas: ['Web'],
      cantidadUsuarios: '10 - 50',
      tiposUsuario: ['Administrador'],
    },
    presupuesto: { presupuesto: 'USD 1.000 - 5.000', plazo: '3 - 6 meses' },
  }
  const projects = [
    {
      ...base,
      asesoramiento: {
        version: 2,
        objetivos: [{ texto: 'Reducir errores de carga', basadoEn: 'registro manual' }],
      },
    },
    {
      ...base,
      problema: { ...base.problema, objetivos: [] },
      asesoramiento: { version: 2, objetivos: [] },
    },
    {
      ...base,
      problema: { ...base.problema, objetivos: [] },
      asesoramiento: { version: 2, objetivos: [], sinAsesor: true },
    },
    { ...base, asesoramiento: { version: 1 } },
  ]
  const markups = projects.map((payload) =>
    renderToStaticMarkup(React.createElement(ResumenProyecto, { payload }))
  )

  assert.match(markups[0], /Inferidos por IA a partir del relevamiento/)
  assert.match(markups[0], /Sistema de gestión/)
  assert.doesNotMatch(markups[0], />gestion</)
  assert.match(markups[0], /class="adm-summary__values"/)
  assert.match(markups[0], /<li>Reducir errores de carga<\/li>/)
  assert.match(markups[1], /Sin objetivos respaldados por el relevamiento/)
  assert.match(markups[2], /Sin objetivos respaldados por el relevamiento/)
  assert.doesNotMatch(markups[3], /Inferidos por IA/)
  for (const markup of markups) assert.doesNotMatch(markup, /<dd><\/dd>/)
})
