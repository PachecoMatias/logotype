const configuredBaseUrl = import.meta.env?.VITE_API_URL || ''

export const API_BASE_URL = configuredBaseUrl.replace(/\/$/, '')

export async function apiRequest(path, options = {}, expectedStatus) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch {
    throw new Error('No se pudo conectar con el servidor.')
  }

  const rawBody = await response.text()
  let body = null

  if (rawBody) {
    try {
      body = JSON.parse(rawBody)
    } catch {
      throw new Error('El servidor devolvió una respuesta inválida.')
    }
  }

  const hasExpectedStatus = expectedStatus
    ? response.status === expectedStatus
    : response.ok

  if (!hasExpectedStatus || body?.success !== true) {
    throw new Error(body?.error?.message || 'La solicitud no pudo completarse.')
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
