import { calcularCronograma } from './calculador.js'

export function adaptarHistorias(historias) {
  if (!Array.isArray(historias)) return []

  return historias.map((historia) => ({ ...historia }))
}

export function prepararHistoriasTablero(historias, fechaInicio) {
  const adaptadas = adaptarHistorias(historias).map((historia) => ({
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
