const configuredBaseUrl = import.meta.env?.VITE_API_URL || ''

export const API_BASE_URL = configuredBaseUrl.replace(/\/$/, '')

export class ApiRequestError extends Error {
  constructor(
    message,
    { status = null, code = null, isNetworkError = false } = {}
  ) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
    this.isNetworkError = isNetworkError
  }
}

export async function apiRequest(path, options = {}, expectedStatus) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch {
    throw new ApiRequestError('No se pudo conectar con el servidor.', {
      isNetworkError: true,
    })
  }

  const rawBody = await response.text()
  let body = null

  if (rawBody) {
    try {
      body = JSON.parse(rawBody)
    } catch {
      throw new ApiRequestError(
        'El servidor devolvió una respuesta inválida.',
        {
          status: response.status,
        }
      )
    }
  }

  const hasExpectedStatus = expectedStatus
    ? response.status === expectedStatus
    : response.ok

  if (!hasExpectedStatus || body?.success !== true) {
    throw new ApiRequestError(
      body?.error?.message || 'La solicitud no pudo completarse.',
      {
        status: response.status,
        code: body?.error?.code || null,
      }
    )
  }

  return body.data
}

export function actualizarHistoria(id, cambios) {
  return apiRequest(`/api/historias/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cambios),
  })
}

export function requestAdvisorRound(payload) {
  return apiRequest('/api/asesor/ronda', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function createProject(payload) {
  return apiRequest(
    '/api/proyectos',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    201
  )
}

export function actualizarColumnaHistoria(id, columnaTablero) {
  return apiRequest(`/api/historias/${id}/columna`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columna_tablero: columnaTablero }),
  })
}
