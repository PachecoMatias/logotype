const relatedFeatures = {
  "Gestión de usuarios": [
    "Login y autenticación",
    "Roles y permisos",
    "Notificaciones",
  ],
  "Login y autenticación": ["Roles y permisos", "Gestión de usuarios"],
  "Roles y permisos": ["Gestión de usuarios", "Login y autenticación"],
  "Gestión de clientes": [
    "Gestión de ventas",
    "Gestión de pedidos",
    "Notificaciones",
  ],
  "Gestión de productos": [
    "Gestión de stock",
    "Gestión de proveedores",
    "Gestión de ventas",
  ],
  "Gestión de proveedores": [
    "Gestión de compras",
    "Gestión de stock",
    "Reportes y estadísticas",
  ],
  "Gestión de ventas": [
    "Facturación",
    "Gestión de clientes",
    "Reportes y estadísticas",
  ],
  "Gestión de compras": [
    "Gestión de proveedores",
    "Gestión de stock",
    "Reportes y estadísticas",
  ],
  Facturación: [
    "Gestión de ventas",
    "Gestión de clientes",
    "Reportes y estadísticas",
  ],
  "Gestión de stock": [
    "Gestión de proveedores",
    "Gestión de compras",
    "Reportes y estadísticas",
  ],
  "Gestión de turnos": ["Notificaciones", "Gestión de clientes", "Dashboard"],
  "Gestión de pedidos": ["Notificaciones", "Gestión de clientes"],
  "Reportes y estadísticas": [
    "Dashboard",
    "Base de datos",
    "Carga de archivos",
  ],
  Dashboard: ["Reportes y estadísticas", "Notificaciones"],
  Notificaciones: [
    "Gestión de usuarios",
    "Gestión de pedidos",
    "Gestión de turnos",
  ],
  "Integración con otras plataformas": [
    "API",
    "Base de datos",
    "Notificaciones",
  ],
  API: [
    "Integración con otras plataformas",
    "Base de datos",
    "Login y autenticación",
  ],
  "Base de datos": ["API", "Reportes y estadísticas", "Carga de archivos"],
  "Carga de archivos": [
    "Base de datos",
    "Gestión de productos",
    "Sistema de tickets",
  ],
  "Sistema de tickets": [
    "Gestión de usuarios",
    "Notificaciones",
    "Reportes y estadísticas",
  ],
};

function nextStage(histories) {
  return String(histories.length + 1);
}

export function hasAdvisorQuestions(round) {
  return Array.isArray(round?.preguntas) && round.preguntas.length > 0;
}

export function hasAdvisorSuggestions(round) {
  return Array.isArray(round?.sugerencias) && round.sugerencias.length > 0;
}

export function serializeAdvisorAnswer(question, draft = {}) {
  if (draft.noSabe) return "";
  if (question.tipo === "opcion" || question.tipo === "mixta") {
    const selected = Array.isArray(draft.selected) ? draft.selected : [];
    const values = [
      ...selected,
      ...(draft.otherSelected && draft.other?.trim()
        ? [`Otra: ${draft.other.trim()}`]
        : []),
    ];
    return values.join("; ");
  }
  return (draft.value || "").trim();
}

export function deserializeAdvisorAnswer(
  question,
  answer = "",
  noSabe = false,
) {
  if (noSabe || answer.trim().toLocaleLowerCase("es") === "no sé") {
    return {
      value: "",
      selected: [],
      otherSelected: false,
      other: "",
      noSabe: true,
    };
  }
  if (question.tipo !== "opcion" && question.tipo !== "mixta") {
    return { value: answer.trim(), noSabe: false };
  }

  const selected = [];
  let other = "";
  for (const part of answer
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean)) {
    const match = part.match(/^Otra:\s*(.*)$/i);
    if (match) other = match[1].trim();
    else selected.push(part);
  }
  return {
    selected,
    otherSelected: Boolean(other),
    other,
    noSabe: false,
  };
}

export function toggleAdvisorOption(draft = {}, option) {
  const selected = new Set(draft.selected || []);
  if (selected.has(option)) selected.delete(option);
  else selected.add(option);
  return { ...draft, value: "", selected: [...selected], noSabe: false };
}

export function toggleAdvisorUnknown(draft = {}) {
  if (draft.noSabe) return { ...draft, noSabe: false };
  return {
    value: "",
    selected: [],
    otherSelected: false,
    other: "",
    noSabe: true,
  };
}

export function hasAdvisorDraftAnswer(question, draft = {}) {
  if (draft.noSabe) return true;
  if (question.tipo === "opcion" || question.tipo === "mixta") {
    if (draft.otherSelected && !draft.other?.trim()) return false;
    return Boolean(
      draft.selected?.length || (draft.otherSelected && draft.other?.trim()),
    );
  }
  return Boolean((draft.value || "").trim());
}

export function rememberShownSuggestions(current, suggestions, limit = 60) {
  return [
    ...new Set([
      ...current,
      ...suggestions.map(({ texto }) => texto).filter((text) => text?.trim()),
    ]),
  ].slice(-limit);
}

export function applyIntegratedAnswers(answers, integratedQuestionIds = []) {
  const integrated = new Set(integratedQuestionIds);
  return answers.map((answer) =>
    integrated.has(answer.preguntaId) ? { ...answer, integrada: true } : answer,
  );
}

export function mergeAdvisorHistories(currentHistories, serverHistories) {
  const currentById = new Map(
    currentHistories.map((story) => [story.id, story]),
  );
  const serverIds = new Set(serverHistories.map(({ id }) => id));
  const merged = serverHistories.map((serverStory) => {
    const currentStory = currentById.get(serverStory.id);
    return currentStory?.bloqueada ? currentStory : serverStory;
  });

  for (const currentStory of currentHistories) {
    if (currentStory.bloqueada && !serverIds.has(currentStory.id))
      merged.push(currentStory);
  }

  return merged;
}

export function applyAdvisorRoundResult(stateAnswers, currentHistories, round) {
  return {
    answers: applyIntegratedAnswers(stateAnswers, round.integradas),
    histories: mergeAdvisorHistories(currentHistories, round.historias),
    round,
  };
}

export function buildAdvisorRoundState({
  idea,
  initialData,
  selectedCatalogFeatures,
  histories,
  answers,
  rejectedSuggestions,
  shownSuggestions = [],
  objectives = [],
}) {
  return {
    idea: idea.trim(),
    datosIniciales: {
      funcionalidades: [
        ...selectedCatalogFeatures,
        ...initialData.otrasFuncionalidades,
        ...(initialData.otraFuncionalidad.trim()
          ? [initialData.otraFuncionalidad.trim()]
          : []),
      ],
      plataformas: initialData.plataformas,
      tiposUsuario: initialData.tiposUsuario,
      cantidadUsuarios: initialData.cantidadUsuarios,
      procesoActual: (initialData.procesoActual ?? "").trim(),
    },
    objetivos: objectives,
    historias: histories,
    respuestas: answers,
    sugerenciasRechazadas: rejectedSuggestions,
    sugerenciasMostradas: shownSuggestions,
  };
}

export function getStoryFunctionalityLabel(story) {
  const explicitFunctionality = story?.funcionalidad?.trim();
  if (explicitFunctionality) return explicitFunctionality;

  const storyText = story?.texto?.trim() || "";
  const action = storyText.match(
    /,\s*quiero\s+(.+?)(?:,\s*para\b|[.!?]?$)/i,
  )?.[1];
  const fallback = (action || storyText).replace(/[,.!?]+$/, "").trim();

  if (!fallback) return "Historia de usuario";
  return fallback.charAt(0).toLocaleUpperCase("es") + fallback.slice(1);
}

export function getStoryStageLabel(stage) {
  const normalizedStage = String(stage ?? "").trim();
  if (
    !normalizedStage ||
    normalizedStage.toLocaleLowerCase("es") === "borrador"
  )
    return null;
  return `Etapa ${normalizedStage}`;
}

export function getRelatedFeatures(selectedFeatures) {
  const selected = new Set(selectedFeatures);
  const suggestions = [];

  for (const feature of selectedFeatures) {
    for (const related of relatedFeatures[feature] || []) {
      if (!selected.has(related) && !suggestions.includes(related))
        suggestions.push(related);
    }
  }

  return suggestions.slice(0, 6);
}

export function addFeatureStory(histories, functionality, createId) {
  const story = {
    id: createId(),
    texto: `Agregar ${functionality.toLocaleLowerCase("es")}.`,
    origen: "cliente",
    estado: "a_completar",
    bloqueada: false,
    etapa: nextStage(histories),
    aDetallar: false,
    funcionalidad: functionality,
  };

  return { histories: [...histories, story], story };
}

export function addManualStory(histories, text, createId) {
  const story = {
    id: createId(),
    texto: text.trim(),
    origen: "cliente",
    estado: "entendida",
    bloqueada: true,
    etapa: nextStage(histories),
    aDetallar: false,
    funcionalidad: null,
  };

  return { histories: [...histories, story], story };
}

export function addSuggestedStory(histories, suggestion, createId) {
  const story = {
    id: createId(),
    texto: suggestion.descripcion.trim(),
    origen: "ia",
    estado: "a_completar",
    bloqueada: false,
    etapa: nextStage(histories),
    aDetallar: false,
    funcionalidad: suggestion.funcionalidad.trim(),
  };

  return { histories: [...histories, story], story };
}

function removeSuggestion(round, suggestionId) {
  return {
    ...round,
    sugerencias: (round.sugerencias || []).filter(
      (suggestion) => suggestion.id !== suggestionId,
    ),
  };
}

export function acceptSuggestion(state, suggestion, createId) {
  const result = addSuggestedStory(state.histories, suggestion, createId);

  return {
    histories: result.histories,
    acceptedSuggestions: [...state.acceptedSuggestions, suggestion.texto],
    feedback: {
      suggestionId: suggestion.id,
      storyId: result.story.id,
      message: "Sugerencia incorporada a “Tu idea, hasta ahora”.",
    },
    round: {
      ...removeSuggestion(state.round, suggestion.id),
      completo: false,
    },
  };
}

export function rejectSuggestion(state, suggestion) {
  return {
    rejectedSuggestions: [...state.rejectedSuggestions, suggestion.texto],
    round: removeSuggestion(state.round, suggestion.id),
  };
}

export function editStory(histories, answers, storyId, text) {
  return {
    histories: histories.map((story) =>
      story.id === storyId
        ? {
            ...story,
            texto: text.trim(),
            origen: "cliente",
            estado: "entendida",
            bloqueada: true,
            aDetallar: false,
          }
        : story,
    ),
    answers: answers.filter((answer) => answer.historiaId !== storyId),
  };
}

export function deleteStory(histories, answers, storyId) {
  return {
    histories: histories.filter((story) => story.id !== storyId),
    answers: answers.filter((answer) => answer.historiaId !== storyId),
  };
}
