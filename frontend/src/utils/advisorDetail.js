function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function joinValues(values) {
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" · ");
}

const projectTypeLabels = Object.freeze({
  web: "Aplicación web",
  movil: "Aplicación móvil",
  gestion: "Sistema de gestión",
  ecommerce: "E-commerce",
  api: "API / Backend",
  personalizada: "Solución personalizada",
});

export function getProjectTypeLabel(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return "";
  if (projectTypeLabels[normalized]) return projectTypeLabels[normalized];
  if (/^[a-z0-9_-]+$/i.test(normalized)) {
    const humanized = normalized.replace(/[_-]+/g, " ").toLowerCase();
    return humanized.charAt(0).toUpperCase() + humanized.slice(1);
  }
  return normalized;
}

function addSummaryItem(summary, label, value, wide = false) {
  const normalized = Array.isArray(value)
    ? joinValues(value)
    : value?.trim?.() || "";
  if (!normalized) return;
  summary.push({ label, value: normalized, ...(wide ? { wide: true } : {}) });
}

function addSummaryValues(summary, label, values) {
  const normalized = asArray(values)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  if (normalized.length === 0) return;
  summary.push({ label, values: normalized, wide: true });
}

function addMetricItem(summary, label, value, balancedWide = false) {
  const before = summary.length;
  addSummaryItem(summary, label, value);
  if (summary.length > before) {
    summary[summary.length - 1].layout = balancedWide
      ? "metric-wide"
      : "metric";
  }
}

export function buildBusinessSummary(payload) {
  if (!payload || typeof payload !== "object") return [];

  const summary = [];
  const company = payload.empresa || {};
  const project = payload.proyecto || {};
  const problem = payload.problema || {};
  const features = payload.funcionalidades || {};
  const scope = payload.alcance || {};
  const budget = payload.presupuesto || {};
  const advisor = payload.asesoramiento;
  const isInferredAdvisor = advisor?.version === 2;
  const selectedFeatures = asArray(features.seleccionadas).filter(
    (item) => item !== "Otra",
  );
  const objectives = asArray(problem.objetivos).map((item) =>
    item === "Otro" ? problem.objetivosOtro || item : item,
  );
  const userTypes = asArray(scope.tiposUsuario).map((item) =>
    item === "Otro" ? scope.tiposUsuarioOtro || item : item,
  );

  addSummaryItem(summary, "Empresa", company.nombreEmpresa);
  addSummaryItem(
    summary,
    "Rubro",
    company.rubro === "Otro"
      ? company.rubroOtro || company.rubro
      : company.rubro,
  );
  if (isInferredAdvisor && advisor.tipoInferido) {
    addSummaryItem(summary, "Tipo de solución", "No especificado por el cliente");
  } else {
    addSummaryItem(summary, "Tipo de proyecto", getProjectTypeLabel(project.tipoProyecto));
  }
  addSummaryItem(summary, "Problema clave", problem.problemaActual, true);
  addSummaryItem(summary, "Proceso actual", problem.procesoActual, true);
  if (isInferredAdvisor) {
    if (objectives.length > 0) {
      addSummaryValues(
        summary,
        "Objetivos · Inferidos por IA a partir del relevamiento",
        objectives,
      );
    } else {
      addSummaryItem(
        summary,
        "Objetivos",
        "Sin objetivos respaldados por el relevamiento",
        true,
      );
    }
  } else {
    addSummaryValues(summary, "Objetivos", objectives);
  }
  addSummaryItem(
    summary,
    "Funcionalidades",
    [...selectedFeatures, features.otra],
    true,
  );
  addMetricItem(summary, "Plataformas", scope.plataformas);
  addMetricItem(summary, "Usuarios estimados", scope.cantidadUsuarios);
  addMetricItem(summary, "Tipos de usuario", userTypes);
  addMetricItem(summary, "Presupuesto", budget.presupuesto, true);
  addMetricItem(summary, "Plazo", budget.plazo, true);
  addSummaryItem(summary, "Información adicional", budget.infoAdicional, true);

  return summary;
}

export function buildAnswerGroups(historias, respuestas) {
  const stories = asArray(historias);
  const answers = asArray(respuestas);
  const groups = stories.map((story, index) => ({
    id: story.id || `advisor-story-${index}`,
    title: story.funcionalidad || `Historia ${index + 1}`,
    description: story.texto || "",
    estado: story.estado || "",
    etapa: story.etapa || "",
    answers: [],
  }));
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const unmatched = [];

  for (const answer of answers) {
    const group = answer.historiaId ? groupsById.get(answer.historiaId) : null;
    if (group) group.answers.push(answer);
    else unmatched.push(answer);
  }

  if (unmatched.length > 0) {
    groups.push({
      id: "sin-hu",
      title: "Sin HU asociada",
      description: "",
      estado: "",
      etapa: "",
      answers: unmatched,
      unmatched: true,
    });
  }

  return groups;
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
