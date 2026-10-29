export function validateAdvisorStart({
  idea,
  procesoActual = "",
  funcionalidades = [],
  otraFuncionalidad = "",
  plataformas = [],
  tiposUsuario = [],
  tiposUsuarioOtro = "",
  cantidadUsuarios = "",
  tipoProyecto = "",
}) {
  const currentProcess = procesoActual.trim();
  return {
    idea: idea.trim() ? "" : "Contanos brevemente qué querés resolver.",
    procesoActual:
      currentProcess.length >= 10
        ? ""
        : "Contanos cómo realizan este proceso actualmente.",
    funcionalidades: funcionalidades.length
      ? ""
      : "Seleccioná al menos una funcionalidad para empezar.",
    otraFuncionalidad:
      funcionalidades.includes("Otra") && !otraFuncionalidad.trim()
        ? "Contanos cuál es esa otra funcionalidad."
        : "",
    plataformas: plataformas.length
      ? ""
      : "Seleccioná al menos una plataforma.",
    tiposUsuario: tiposUsuario.length
      ? ""
      : "Seleccioná al menos un tipo de usuario.",
    tiposUsuarioOtro:
      tiposUsuario.includes("Otro") && !tiposUsuarioOtro.trim()
        ? "Contanos cuál es ese otro tipo de usuario."
        : "",
    cantidadUsuarios: cantidadUsuarios
      ? ""
      : "Indicá la cantidad estimada de usuarios.",
    tipoProyecto: tipoProyecto
      ? ""
      : "Seleccioná el tipo de solución que buscás.",
  };
}

const advisorStartDetailFields = [
  "tipoProyecto",
  "funcionalidades",
  "otraFuncionalidad",
  "plataformas",
  "cantidadUsuarios",
  "tiposUsuario",
  "tiposUsuarioOtro",
];

export function hasAdvisorStartDetailErrors(errors = {}) {
  return advisorStartDetailFields.some((field) => Boolean(errors[field]));
}
