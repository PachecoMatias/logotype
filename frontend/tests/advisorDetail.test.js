import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildAdvisorDetail,
  buildAnswerGroups,
  buildBusinessSummary,
  getProjectTypeLabel,
} from "../src/utils/advisorDetail.js";

test("builds readable advisor detail and preserves legacy absence", () => {
  assert.equal(buildAdvisorDetail(undefined), null);

  const detail = buildAdvisorDetail({
    version: 1,
    ideaOriginal: "Una ferretería necesita ordenar ventas y stock.",
    historias: [
      {
        id: "hu-1",
        texto:
          "Como vendedor, quiero registrar ventas, para actualizar el stock.",
        estado: "supuesta",
        etapa: "1",
        aDetallar: true,
        funcionalidad: "Gestión de ventas",
      },
    ],
    respuestas: [
      {
        historiaId: "hu-1",
        aspecto: "volumen",
        pregunta: "¿Cuántas ventas realizan?",
        respuesta: "",
        noSabe: true,
      },
    ],
    sugerencias: {
      aceptadas: ["Agregar alertas de stock"],
      rechazadas: ["Agregar pagos en criptomonedas"],
    },
    completo: true,
    rondas: 3,
    sinAsesor: false,
  });

  assert.deepEqual(detail, {
    version: 1,
    ideaOriginal: "Una ferretería necesita ordenar ventas y stock.",
    historias: [
      {
        id: "hu-1",
        texto:
          "Como vendedor, quiero registrar ventas, para actualizar el stock.",
        estado: "supuesta",
        etapa: "1",
        aDetallar: true,
        funcionalidad: "Gestión de ventas",
      },
    ],
    respuestas: [
      {
        historiaId: "hu-1",
        aspecto: "volumen",
        pregunta: "¿Cuántas ventas realizan?",
        respuesta: "No sabe",
        noSabe: true,
      },
    ],
    sugerenciasAceptadas: ["Agregar alertas de stock"],
    sugerenciasRechazadas: ["Agregar pagos en criptomonedas"],
    completo: true,
    rondas: 3,
    sinAsesor: false,
  });
});

test("builds a concise business summary from the existing project payload", () => {
  const summary = buildBusinessSummary({
    empresa: { nombreEmpresa: "Librería Norte", rubro: "Comercio" },
    proyecto: { tipoProyecto: "Sistema web" },
    problema: {
      problemaActual: "Errores de cobro y falta de control de stock.",
      procesoActual: "Registro manual en planillas.",
      objetivos: ["Reducir errores", "Controlar inventario"],
    },
    funcionalidades: {
      seleccionadas: ["Gestión de ventas", "Gestión de stock"],
      otra: "Alertas de stock",
    },
    alcance: {
      plataformas: ["Web"],
      cantidadUsuarios: "10 a 25",
      tiposUsuario: ["Vendedor", "Administrador"],
    },
    presupuesto: {
      presupuesto: "USD 10.000 a 20.000",
      plazo: "3 a 6 meses",
      infoAdicional: "Priorizar ventas.",
    },
  });

  assert.deepEqual(summary, [
    { label: "Empresa", value: "Librería Norte" },
    { label: "Rubro", value: "Comercio" },
    { label: "Tipo de proyecto", value: "Sistema web" },
    {
      label: "Problema clave",
      value: "Errores de cobro y falta de control de stock.",
      wide: true,
    },
    { label: "Proceso actual", value: "Registro manual en planillas.", wide: true },
    {
      label: "Objetivos",
      values: ["Reducir errores", "Controlar inventario"],
      wide: true,
    },
    {
      label: "Funcionalidades",
      value: "Gestión de ventas · Gestión de stock · Alertas de stock",
      wide: true,
    },
    { label: "Plataformas", value: "Web", layout: "metric" },
    { label: "Usuarios estimados", value: "10 a 25", layout: "metric" },
    {
      label: "Tipos de usuario",
      value: "Vendedor · Administrador",
      layout: "metric",
    },
    {
      label: "Presupuesto",
      value: "USD 10.000 a 20.000",
      layout: "metric-wide",
    },
    { label: "Plazo", value: "3 a 6 meses", layout: "metric-wide" },
    { label: "Información adicional", value: "Priorizar ventas.", wide: true },
  ]);
});

test("humanizes every project type and safely preserves unknown legacy values", () => {
  assert.deepEqual(
    ["web", "movil", "gestion", "ecommerce", "api", "personalizada"].map(
      getProjectTypeLabel,
    ),
    [
      "Aplicación web",
      "Aplicación móvil",
      "Sistema de gestión",
      "E-commerce",
      "API / Backend",
      "Solución personalizada",
    ],
  );
  assert.equal(getProjectTypeLabel("Sistema legado"), "Sistema legado");
  assert.equal(getProjectTypeLabel("  tipo_desconocido  "), "Tipo desconocido");
  assert.equal(getProjectTypeLabel(""), "");
});

test("labels v2 inferred objectives, handles empty objectives, and preserves legacy summaries", () => {
  const base = {
    empresa: { nombreEmpresa: "Librería Norte", rubro: "Comercio" },
    proyecto: { tipoProyecto: "personalizada" },
    problema: {
      problemaActual: "Errores de carga.",
      procesoActual: "Carga manual en planillas.",
      objetivos: ["Reducir errores de carga"],
    },
    funcionalidades: { seleccionadas: ["Gestión de ventas"] },
    alcance: {
      plataformas: ["Web"],
      cantidadUsuarios: "10 - 50",
      tiposUsuario: ["Administrador"],
    },
    presupuesto: { presupuesto: "USD 1.000 - 5.000", plazo: "3 - 6 meses" },
  };
  const inferred = buildBusinessSummary({
    ...base,
    asesoramiento: {
      version: 2,
      tipoInferido: true,
      objetivos: [{ texto: "Reducir errores de carga", basadoEn: "carga manual" }],
    },
  });
  const withoutObjectives = buildBusinessSummary({
    ...base,
    problema: { ...base.problema, objetivos: [] },
    asesoramiento: { version: 2, tipoInferido: false, objetivos: [] },
  });
  const withoutAdvisor = buildBusinessSummary({ ...base, asesoramiento: undefined });
  const legacy = buildBusinessSummary({ ...base, asesoramiento: { version: 1 } });

  assert.ok(
    inferred.some(
      ({ label, value }) =>
        label === "Tipo de solución" && value === "No especificado por el cliente",
    ),
  );
  assert.ok(
    inferred.some(
      ({ label, values }) =>
        label === "Objetivos · Inferidos por IA a partir del relevamiento" &&
        values?.[0] === "Reducir errores de carga",
    ),
  );
  assert.ok(
    withoutObjectives.some(
      ({ label, value }) =>
        label === "Objetivos" && value === "Sin objetivos respaldados por el relevamiento",
    ),
  );
  assert.ok(withoutAdvisor.some(({ label }) => label === "Objetivos"));
  assert.ok(legacy.some(({ label }) => label === "Objetivos"));
  for (const summary of [inferred, withoutObjectives, withoutAdvisor, legacy]) {
    assert.ok(summary.every(({ label, value, values }) => label && (value || values?.length)));
  }
});

test("keeps AI opinion in a separate panel view", async () => {
  const [appSource, detailSource, analysisSource] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/components/Panel/PanelDetalle.jsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/components/Panel/PanelAnalisis.jsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(appSource, /panel-analisis/);
  assert.match(appSource, /<PanelAnalisis/);
  assert.match(detailSource, /onViewAnalysis/);
  assert.match(detailSource, /Ver opinión de la IA/);
  assert.match(detailSource, /Resumen del proyecto/);
  assert.doesNotMatch(detailSource, /<AnalisisIA/);
  assert.doesNotMatch(detailSource, /Detalle de solicitud/);
  assert.match(analysisSource, /<AnalisisIA/);
  assert.match(analysisSource, /Opinión de la IA/);
});

test("groups advisor answers exclusively by their own user story", () => {
  const groups = buildAnswerGroups(
    [
      {
        id: "hu-1",
        funcionalidad: "Gestión de ventas",
        texto: "Como vendedor, quiero registrar ventas.",
      },
      {
        id: "hu-2",
        funcionalidad: "Control de stock",
        texto: "Como depósito, quiero ver el stock disponible.",
      },
      {
        id: "hu-3",
        funcionalidad: "Reportes",
        texto: "Como dueño, quiero consultar reportes.",
      },
    ],
    [
      { historiaId: "hu-1", aspecto: "volumen", pregunta: "¿Cuántas ventas?" },
      { historiaId: "hu-2", aspecto: "alertas", pregunta: "¿Cuándo avisar?" },
      { historiaId: "hu-1", aspecto: "medios", pregunta: "¿Qué medios?" },
      { historiaId: "hu-9", aspecto: "otro", pregunta: "¿Sin HU?" },
    ],
  );

  assert.equal(groups.length, 4);
  assert.equal(groups[0].title, "Gestión de ventas");
  assert.equal(groups[0].description, "Como vendedor, quiero registrar ventas.");
  assert.deepEqual(
    groups[0].answers.map((answer) => answer.pregunta),
    ["¿Cuántas ventas?", "¿Qué medios?"],
  );
  assert.deepEqual(
    groups[1].answers.map((answer) => answer.pregunta),
    ["¿Cuándo avisar?"],
  );
  assert.deepEqual(groups[2].answers, []);
  assert.equal(groups[3].title, "Sin HU asociada");
  assert.equal(groups[3].unmatched, true);
  assert.equal(groups[3].answers[0].pregunta, "¿Sin HU?");
});

test("detail exposes one isolated answers modal per story", async () => {
  const [detailSource, modalSource, styles] = await Promise.all([
    readFile(
      new URL("../src/components/Panel/PanelDetalle.jsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/components/Panel/AdvisorAnswersModal.jsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/styles/panel.css", import.meta.url), "utf8"),
  ]);

  assert.match(detailSource, /buildAnswerGroups/);
  assert.match(detailSource, /<AdvisorAnswersModal/);
  assert.match(detailSource, /Ver preguntas y respuestas/);
  assert.match(detailSource, /setGrupoRespuestas/);
  assert.match(modalSource, /role="dialog"/);
  assert.match(modalSource, /aria-modal="true"/);
  assert.match(modalSource, /event\.key === "Escape"/);
  assert.match(modalSource, /document\.body\.style\.overflow = "hidden"/);
  assert.match(modalSource, /window\.scrollTo\(0, scrollY\)/);
  assert.match(modalSource, /event\.target === event\.currentTarget/);
  assert.match(modalSource, /Descripción de la HU/);
  assert.match(modalSource, /Pregunta de la IA/);
  assert.match(modalSource, /Respuesta del cliente/);
  assert.match(styles, /\.adm-modal--answers\s*\{[^}]*display:\s*flex[^}]*overflow:\s*hidden/s);
  assert.match(
    styles,
    /\.adm-modal--answers \.adm-modal__body\s*\{[^}]*overflow-y:\s*auto[^}]*overscroll-behavior:\s*contain/s,
  );
});

test("AI risks are independent labeled blocks and navigation moves to the end", async () => {
  const [analysisSource, detailSource, panelStyles] = await Promise.all([
    readFile(
      new URL("../src/components/Panel/AnalisisIA.jsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/components/Panel/PanelDetalle.jsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/styles/panel.css", import.meta.url), "utf8"),
  ]);

  assert.match(analysisSource, /adm-ai__risk-block/);
  assert.match(analysisSource, /Descripción/);
  assert.match(analysisSource, /Mitigación/);
  assert.match(analysisSource, /adm-ai__risk--\$\{risk\.impacto\}/);
  assert.match(panelStyles, /\.adm-ai__risks\s*\{[^}]*gap:/s);
  assert.match(
    panelStyles,
    /\.adm-ai__risk\s*\{[^}]*border:\s*1px solid[^}]*background:/s,
  );
  assert.doesNotMatch(detailSource, /adm-view-links/);
  const actionsIndex = detailSource.indexOf('className="adm-view-actions"');
  const summaryIndex = detailSource.indexOf("<ResumenProyecto");
  assert.ok(actionsIndex > summaryIndex);
  assert.ok(actionsIndex > detailSource.indexOf("adm-decision"));
});

test("panel scroll is stable and client form titles share one hierarchy", async () => {
  const [indexStyles, panelStyles, advisorStyles, appSource] = await Promise.all([
    readFile(new URL("../src/index.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/panel.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/advisor.css", import.meta.url), "utf8"),
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(indexStyles, /^header\s*\{/m);
  assert.match(indexStyles, /\.site-header\s*\{/);
  assert.match(appSource, /adm-body/);
  assert.match(panelStyles, /body\.adm-body\s*\{[^}]*background-color:/s);
  assert.match(
    advisorStyles,
    /\.adv-start__form \.adv-field > label,\s*\.adv-start__form \.adv-option-group > legend\s*\{[^}]*color:\s*var\(--adv-accent\)[^}]*font-family:\s*var\(--cfg-display\)[^}]*font-size:\s*1rem/s,
  );
  assert.match(
    panelStyles,
    /\.adm-section\s*\{[^}]*padding:\s*clamp\(18px,\s*2\.8vw,\s*32px\)\s*0\s*clamp\(44px,\s*5vw,\s*64px\)/s,
  );
});
