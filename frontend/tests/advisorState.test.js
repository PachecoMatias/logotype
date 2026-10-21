import assert from 'node:assert/strict'
import test from 'node:test'

import {
  addFeatureStory,
  addManualStory,
  editStory,
  getRelatedFeatures,
} from '../src/utils/advisorState.js'

test('related feature suggestions use the fixed catalog map and exclude selected items', () => {
  assert.deepEqual(
    getRelatedFeatures(['Gestión de stock', 'Gestión de proveedores']),
    ['Gestión de compras', 'Reportes y estadísticas']
  )
})

test('feature additions stay unlocked while manual and edited stories are client locked', () => {
  const featureStory = addFeatureStory(
    [],
    'Gestión de ventas',
    () => 'hu-feature'
  )
  const manualStory = addManualStory(
    featureStory.histories,
    'Necesito registrar devoluciones',
    () => 'hu-manual'
  )
  const edited = editStory(
    manualStory.histories,
    [{ historiaId: 'hu-manual', aspecto: 'beneficio' }],
    'hu-manual',
    'Como cliente, quiero registrar devoluciones, para corregir mi compra.'
  )

  assert.equal(featureStory.histories[0].bloqueada, false)
  assert.equal(featureStory.histories[0].estado, 'sugerida_ia')
  assert.equal(manualStory.histories[1].bloqueada, true)
  assert.equal(manualStory.histories[1].estado, 'editada_cliente')
  assert.equal(
    edited.histories[1].texto,
    'Como cliente, quiero registrar devoluciones, para corregir mi compra.'
  )
  assert.deepEqual(edited.answers, [])
})
