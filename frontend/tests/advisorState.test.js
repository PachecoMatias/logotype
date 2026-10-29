import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptSuggestion,
  addFeatureStory,
  addManualStory,
  applyAdvisorRoundResult,
  buildAdvisorRoundState,
  deserializeAdvisorAnswer,
  editStory,
  getStoryFunctionalityLabel,
  getStoryStageLabel,
  getRelatedFeatures,
  hasAdvisorDraftAnswer,
  hasAdvisorQuestions,
  hasAdvisorSuggestions,
  rememberShownSuggestions,
  rejectSuggestion,
  serializeAdvisorAnswer,
  toggleAdvisorOption,
  toggleAdvisorUnknown,
} from "../src/utils/advisorState.js";

test("related feature suggestions use the fixed catalog map and exclude selected items", () => {
  assert.deepEqual(
    getRelatedFeatures(["Gestión de stock", "Gestión de proveedores"]),
    ["Gestión de compras", "Reportes y estadísticas"],
  );
});

test("client-created stories keep client origin and begin pending detail", () => {
  const featureStory = addFeatureStory(
    [],
    "Gestión de ventas",
    () => "hu-feature",
  );
  const manualStory = addManualStory(
    featureStory.histories,
    "Necesito registrar devoluciones",
    () => "hu-manual",
  );
  const edited = editStory(
    manualStory.histories,
    [{ historiaId: "hu-manual", aspecto: "beneficio" }],
    "hu-manual",
    "Como cliente, quiero registrar devoluciones, para corregir mi compra.",
  );

  assert.equal(featureStory.histories[0].bloqueada, false);
  assert.equal(featureStory.histories[0].origen, "cliente");
  assert.equal(featureStory.histories[0].estado, "a_completar");
  assert.equal(manualStory.histories[1].bloqueada, true);
  assert.equal(manualStory.histories[1].origen, "cliente");
  assert.equal(manualStory.histories[1].estado, "entendida");
  assert.equal(
    edited.histories[1].texto,
    "Como cliente, quiero registrar devoluciones, para corregir mi compra.",
  );
  assert.deepEqual(edited.answers, []);
});

test("option answers serialize and deserialize as a readable string", () => {
  const question = { tipo: "opcion" };
  const draft = {
    selected: ["Web", "Mobile"],
    otherSelected: true,
    other: "Kiosco",
    noSabe: false,
  };

  assert.equal(hasAdvisorDraftAnswer(question, draft), true);
  assert.equal(
    serializeAdvisorAnswer(question, draft),
    "Web; Mobile; Otra: Kiosco",
  );
  assert.deepEqual(
    deserializeAdvisorAnswer(question, "Web; Mobile; Otra: Kiosco"),
    draft,
  );
});

test("Otra requires text and No sé remains exclusive", () => {
  const question = { tipo: "mixta" };
  const incompleteOther = {
    selected: ["Web"],
    otherSelected: true,
    other: " ",
    noSabe: false,
  };

  assert.equal(hasAdvisorDraftAnswer(question, incompleteOther), false);
  assert.deepEqual(toggleAdvisorUnknown(incompleteOther), {
    value: "",
    selected: [],
    otherSelected: false,
    other: "",
    noSabe: true,
  });
  assert.deepEqual(
    toggleAdvisorOption(toggleAdvisorUnknown(incompleteOther), "Web"),
    {
      value: "",
      selected: ["Web"],
      otherSelected: false,
      other: "",
      noSabe: false,
    },
  );
  assert.equal(hasAdvisorDraftAnswer(question, { noSabe: true }), true);
});

test("an incomplete continuation response with pending questions is renderable", () => {
  const round = {
    foco: { historiaId: "hu-1" },
    preguntas: [
      {
        id: "pregunta-beneficio",
        aspecto: "beneficio",
        tipo: "texto",
        texto: "¿Qué beneficio necesitás obtener?",
        opciones: [],
      },
    ],
    progreso: { detalladas: 1, total: 1, completas: 0, tope: 6 },
    completo: false,
    motivoCierre: null,
  };

  assert.equal(hasAdvisorQuestions(round), true);
});

test("focused story presentation uses functionality and a human fallback from the HU", () => {
  assert.equal(
    getStoryFunctionalityLabel({
      funcionalidad: "Gestión de ventas",
      texto:
        "Como empleado, quiero registrar ventas, para controlar el dinero.",
    }),
    "Gestión de ventas",
  );
  assert.equal(
    getStoryFunctionalityLabel({
      funcionalidad: null,
      texto:
        "Como empleado, quiero registrar las ventas realizadas, para tener un control del flujo de dinero.",
    }),
    "Registrar las ventas realizadas",
  );
});

test("generic draft stage is presentation noise while real stage values remain visible", () => {
  assert.equal(getStoryStageLabel("borrador"), null);
  assert.equal(getStoryStageLabel(" Borrador "), null);
  assert.equal(getStoryStageLabel("2"), "Etapa 2");
});

test("accepting a suggestion creates an unlocked AI story and returns visible confirmation feedback", () => {
  const suggestion = {
    id: "sugerencia-1",
    tipo: "mejora",
    texto: "¿Querés agregar facturación asociada a las ventas?",
    funcionalidad: "Facturación",
    descripcion: "Agregar facturación asociada a la gestión de ventas.",
  };
  const result = acceptSuggestion(
    {
      histories: [],
      acceptedSuggestions: [],
      round: { completo: true, sugerencias: [suggestion] },
    },
    suggestion,
    () => "hu-sugerida",
  );

  assert.equal(result.histories[0].origen, "ia");
  assert.equal(result.histories[0].estado, "a_completar");
  assert.equal(result.histories[0].bloqueada, false);
  assert.equal(result.histories[0].funcionalidad, "Facturación");
  assert.equal(
    result.histories[0].texto,
    "Agregar facturación asociada a la gestión de ventas.",
  );
  assert.doesNotMatch(result.histories[0].texto, /¿Querés/);
  assert.deepEqual(result.acceptedSuggestions, [suggestion.texto]);
  assert.deepEqual(result.round.sugerencias, []);
  assert.equal(result.round.completo, false);
  assert.deepEqual(result.feedback, {
    suggestionId: "sugerencia-1",
    storyId: "hu-sugerida",
    message: "Sugerencia incorporada a “Tu idea, hasta ahora”.",
  });
});

test("rejecting a suggestion remembers its text and an empty list remains render-safe", () => {
  const suggestion = {
    id: "sugerencia-1",
    tipo: "mejora",
    texto: "Importar productos desde una planilla.",
  };
  const result = rejectSuggestion(
    {
      rejectedSuggestions: [],
      round: { sugerencias: [suggestion] },
    },
    suggestion,
  );

  assert.deepEqual(result.rejectedSuggestions, [suggestion.texto]);
  assert.deepEqual(result.round.sugerencias, []);
  assert.equal(hasAdvisorSuggestions(result.round), false);
  assert.equal(hasAdvisorSuggestions({ sugerencias: [] }), false);
});

test("displayed suggestions are remembered once and bounded for the next request", () => {
  const remembered = rememberShownSuggestions(
    ["Sugerencia anterior"],
    [
      { texto: "Nueva sugerencia" },
      { texto: "Sugerencia anterior" },
      { texto: "" },
    ],
    2,
  );

  assert.deepEqual(remembered, ["Sugerencia anterior", "Nueva sugerencia"]);
});

test("applying a round replaces the full story list so the previous HU shows its latest refinement", () => {
  const originalSecondText =
    "Como encargado, quiero revisar el stock, para conocer la disponibilidad.";
  const refinedText =
    "Como empleado de la librería, quiero registrar cada venta con productos, cantidades, precios y total, para controlar los ingresos.";
  const round = {
    historias: [
      { id: "hu-1", texto: refinedText },
      { id: "hu-2", texto: originalSecondText },
    ],
    foco: { historiaId: "hu-2" },
    integradas: ["respuesta-confirmada"],
    preguntas: [],
    sugerencias: [],
  };
  const result = applyAdvisorRoundResult(
    [
      {
        preguntaId: "respuesta-confirmada",
        historiaId: "hu-1",
        aspecto: "beneficio",
        integrada: false,
      },
      {
        preguntaId: "respuesta-pendiente",
        historiaId: "hu-1",
        aspecto: "volumen",
        integrada: false,
      },
    ],
    [
      {
        id: "hu-1",
        texto:
          "Como empleado, quiero registrar ventas, para controlar ingresos.",
        bloqueada: false,
      },
      { id: "hu-2", texto: originalSecondText, bloqueada: false },
    ],
    round,
  );

  assert.equal(result.histories[0].texto, refinedText);
  assert.equal(result.histories[1].texto, originalSecondText);
  assert.deepEqual(result.round.foco, { historiaId: "hu-2" });
  assert.equal(result.answers[0].integrada, true);
  assert.equal(result.answers[1].integrada, false);
  assert.equal(result.round, round);
});

test("applying a round preserves a client edit completed while the request was in flight", () => {
  const clientEdit = {
    id: "hu-1",
    texto:
      "Como encargada, quiero registrar ventas y devoluciones, para controlar la caja.",
    estado: "editada_cliente",
    bloqueada: true,
  };
  const round = {
    historias: [
      {
        id: "hu-1",
        texto: "Texto refinado por una respuesta anterior",
        estado: "entendida",
        bloqueada: false,
      },
    ],
    integradas: [],
    preguntas: [],
    sugerencias: [],
  };

  const result = applyAdvisorRoundResult([], [clientEdit], round);

  assert.deepEqual(result.histories, [clientEdit]);
});

test("the next advisor request carries refined histories and pending acknowledgements", () => {
  const refinedText =
    "Como empleado, quiero registrar ventas con productos y total, para controlar lo vendido cada día.";
  const pending = {
    preguntaId: "respuesta-pendiente",
    historiaId: "hu-1",
    aspecto: "volumen",
    integrada: false,
  };
  const applied = applyAdvisorRoundResult(
    [pending],
    [{ id: "hu-1", texto: "Texto anterior", bloqueada: false }],
    {
      historias: [{ id: "hu-1", texto: refinedText, bloqueada: false }],
      integradas: [],
      preguntas: [],
      sugerencias: [],
    },
  );
  const requestState = buildAdvisorRoundState({
    idea: "Registrar ventas",
    initialData: {
      otrasFuncionalidades: [],
      otraFuncionalidad: "",
      plataformas: ["Web"],
      tiposUsuario: ["Empleado"],
      cantidadUsuarios: "10",
    },
    selectedCatalogFeatures: ["Gestión de ventas"],
    histories: applied.histories,
    answers: applied.answers,
    rejectedSuggestions: [],
    shownSuggestions: ["¿Querés identificar las ventas anuladas?"],
  });

  assert.equal(requestState.historias[0].texto, refinedText);
  assert.equal(requestState.respuestas[0].integrada, false);
  assert.deepEqual(requestState.sugerenciasMostradas, [
    "¿Querés identificar las ventas anuladas?",
  ]);
});
