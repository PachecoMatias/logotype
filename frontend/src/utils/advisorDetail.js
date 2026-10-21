function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function buildAdvisorDetail(advisor) {
  if (!advisor || typeof advisor !== "object") return null;

  return {
    version: advisor.version,
    ideaOriginal: advisor.ideaOriginal || "",
    historias: asArray(advisor.historias).map(
      ({ id, texto, estado, etapa, aDetallar, funcionalidad }) => ({
        id,
        texto,
        estado,
        etapa,
        aDetallar: aDetallar === true,
        funcionalidad,
      }),
    ),
    respuestas: asArray(advisor.respuestas).map(
      ({ historiaId, aspecto, pregunta, respuesta, noSabe }) => ({
        historiaId,
        aspecto,
        pregunta,
        respuesta: noSabe ? "No sabe" : respuesta || "",
        noSabe: noSabe === true,
      }),
    ),
    sugerenciasAceptadas: asArray(advisor.sugerencias?.aceptadas),
    sugerenciasRechazadas: asArray(advisor.sugerencias?.rechazadas),
    completo: advisor.completo === true,
    rondas: advisor.rondas,
    sinAsesor: advisor.sinAsesor === true,
  };
}
