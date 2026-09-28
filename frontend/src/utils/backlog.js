import { calcularCronograma } from './calculador.js'

export function adaptarHistorias(historias, projectId) {
  if (!Array.isArray(historias)) return []

  return historias.map((historia, index) => ({
    ...historia,
    id: historia.id ?? `${projectId}-story-${index + 1}`,
  }))
}

export function prepararHistoriasTablero(historias, projectId, fechaInicio) {
  const adaptadas = adaptarHistorias(historias, projectId).map((historia) => ({
    ...historia,
    rol_asignado: historia.rol_asignado || historia.rol_sugerido,
  }))

  try {
    return calcularCronograma(adaptadas, fechaInicio)
  } catch (error) {
    console.warn('No se pudo calcular el cronograma:', error.message)
    return adaptadas
  }
}
