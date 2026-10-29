import { featuresList } from '../data/projectOptions.js'

const projectTypeIds = new Set([
  'web',
  'movil',
  'gestion',
  'ecommerce',
  'api',
  'personalizada',
])
const catalogFeatures = new Set(featuresList.filter((item) => item !== 'Otra'))

export function buildAdvisorProjectPayload({
  idea,
  initialData,
  histories,
  answers,
  acceptedSuggestions,
  rejectedSuggestions,
  complete,
  rounds,
  withoutAdvisor,
  finalData,
  objectives = [],
}) {
  const currentStoryFeatures = new Set(
    histories
      .map(({ funcionalidad }) => funcionalidad?.trim())
      .filter(Boolean)
  )
  let selectedFeatures = [
    ...new Set(
      histories
        .map(({ funcionalidad }) => funcionalidad?.trim())
        .filter((feature) => catalogFeatures.has(feature))
    ),
  ]
  const customFeatures = [
    initialData.otraFuncionalidad,
    ...(initialData.otrasFuncionalidades || []),
  ]
    .map((value) => value?.trim())
    .filter(Boolean)

  for (const feature of initialData.funcionalidades) {
    if (
      catalogFeatures.has(feature) &&
      currentStoryFeatures.has(feature) &&
      !selectedFeatures.includes(feature)
    ) {
      selectedFeatures.push(feature)
    }
  }
  if (
    initialData.funcionalidades.includes('Otra') &&
    customFeatures.some((feature) => currentStoryFeatures.has(feature)) &&
    !selectedFeatures.includes('Otra')
  ) {
    selectedFeatures.push('Otra')
  }
  if (selectedFeatures.length === 0) {
    selectedFeatures = [...new Set(initialData.funcionalidades)]
  }

  const tipoInferido = !projectTypeIds.has(initialData.tipoProyecto)
  const validatedObjectives = withoutAdvisor ? [] : objectives

  return {
    empresa: { ...finalData.empresa },
    proyecto: {
      tipoProyecto: tipoInferido ? 'personalizada' : initialData.tipoProyecto,
    },
    problema: {
      problemaActual: idea.trim(),
      procesoActual: initialData.procesoActual.trim(),
      objetivos: validatedObjectives.map(({ texto }) => texto),
      objetivosOtro: '',
    },
    funcionalidades: {
      seleccionadas: selectedFeatures,
      otra: customFeatures.join(', '),
    },
    alcance: {
      plataformas: [...initialData.plataformas],
      cantidadUsuarios: initialData.cantidadUsuarios,
      necesitaTiposUsuario: initialData.tiposUsuario.length ? 'Sí' : 'No',
      tiposUsuario: [...initialData.tiposUsuario],
      tiposUsuarioOtro: initialData.tiposUsuarioOtro || '',
    },
    presupuesto: { ...finalData.presupuesto },
    asesoramiento: {
      version: 2,
      ideaOriginal: idea.trim(),
      procesoActual: initialData.procesoActual.trim(),
      tipoInferido,
      objetivos: validatedObjectives.map(({ texto, basadoEn }) => ({
        texto,
        basadoEn,
      })),
      historias: histories.map(
        ({ id, texto, estado, etapa, aDetallar, funcionalidad }) => ({
          id,
          texto,
          estado,
          etapa,
          aDetallar,
          funcionalidad,
        })
      ),
      respuestas: answers.map(
        ({ historiaId, aspecto, pregunta, respuesta, noSabe }) => ({
          historiaId,
          aspecto,
          pregunta,
          respuesta,
          noSabe,
        })
      ),
      sugerencias: {
        aceptadas: [...acceptedSuggestions],
        rechazadas: [...rejectedSuggestions],
      },
      completo: complete,
      rondas: rounds,
      sinAsesor: withoutAdvisor,
    },
  }
}
