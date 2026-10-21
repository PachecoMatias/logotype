import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiRequestError, apiRequest } from '../src/utils/api.js'

test('apiRequest preserves public status and code for advisor fallback decisions', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'ADVISOR_UNAVAILABLE',
          message: 'El asesor no está disponible.',
        },
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )

  try {
    await assert.rejects(apiRequest('/api/asesor/ronda'), (error) => {
      assert.ok(error instanceof ApiRequestError)
      assert.equal(error.status, 503)
      assert.equal(error.code, 'ADVISOR_UNAVAILABLE')
      assert.equal(error.isNetworkError, false)
      return true
    })
  } finally {
    globalThis.fetch = previousFetch
  }
})
