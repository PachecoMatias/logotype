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
}) {
  const selectedFeatures = [...new Set(initialData.funcionalidades)]
  const customFeatures = [
    initialData.otraFuncionalidad,
    ...(initialData.otrasFuncionalidades || []),
  ]
    .map((value) => value?.trim())
    .filter(Boolean)

  if (customFeatures.length && !selectedFeatures.includes('Otra'))
    selectedFeatures.push('Otra')

  return {
    empresa: { ...finalData.empresa },
    proyecto: { ...finalData.proyecto },
    problema: {
      problemaActual: idea.trim(),
      procesoActual: finalData.problema.procesoActual,
      objetivos: [...finalData.problema.objetivos],
      objetivosOtro: finalData.problema.objetivosOtro,
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
      version: 1,
      ideaOriginal: idea.trim(),
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
