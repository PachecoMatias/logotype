import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AdvisorStoryText } from "../src/components/ProjectConfigurator/AdvisorStoryText.js";
import { AdvisorDegradedNotice } from "../src/components/ProjectConfigurator/AdvisorDegradedNotice.js";
import { AdvisorQuestion } from "../src/components/ProjectConfigurator/AdvisorQuestion.js";
import {
  hasAdvisorStartDetailErrors,
  validateAdvisorStart,
} from "../src/utils/validation.js";

const workspaceUrl = new URL(
  "../src/components/ProjectConfigurator/AdvisorWorkspace.jsx",
  import.meta.url,
);
const configuratorUrl = new URL(
  "../src/components/ProjectConfigurator/ProjectConfigurator.jsx",
  import.meta.url,
);
const startUrl = new URL(
  "../src/components/ProjectConfigurator/AdvisorStart.jsx",
  import.meta.url,
);
const confirmationUrl = new URL(
  "../src/components/ProjectConfigurator/AdvisorConfirmation.jsx",
  import.meta.url,
);
const stylesUrl = new URL("../src/styles/advisor.css", import.meta.url);

test("advisor start requires all project context including the current process", () => {
  assert.deepEqual(
    validateAdvisorStart({ idea: "   ", funcionalidades: [] }),
    {
      idea: "Contanos brevemente qué querés resolver.",
      procesoActual: "Contanos cómo realizan este proceso actualmente.",
      funcionalidades: "Seleccioná al menos una funcionalidad para empezar.",
      otraFuncionalidad: "",
      plataformas: "Seleccioná al menos una plataforma.",
      tiposUsuario: "Seleccioná al menos un tipo de usuario.",
      tiposUsuarioOtro: "",
      cantidadUsuarios: "Indicá la cantidad estimada de usuarios.",
      tipoProyecto: "Seleccioná el tipo de solución que buscás.",
    },
  );
  assert.deepEqual(
    validateAdvisorStart({
      idea: "Necesito ordenar las ventas.",
      procesoActual: "Hoy registramos cada venta de forma manual.",
      funcionalidades: ["Gestión de ventas"],
      plataformas: ["Web"],
      tiposUsuario: ["Administrador"],
      cantidadUsuarios: "1 - 10",
      tipoProyecto: "no_estoy_seguro",
    }),
    {
      idea: "",
      procesoActual: "",
      funcionalidades: "",
      otraFuncionalidad: "",
      plataformas: "",
      tiposUsuario: "",
      tiposUsuarioOtro: "",
      cantidadUsuarios: "",
      tipoProyecto: "",
    },
  );
});

test("secondary project context stays mounted in an accessible closed accordion", async () => {
  const [startSource, configuratorSource, styles] = await Promise.all([
    readFile(startUrl, "utf8"),
    readFile(configuratorUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(startSource, /¿Cómo realizan actualmente este proceso\?/);
  assert.match(startSource, /No estoy seguro/);
  assert.match(startSource, /Agregar más detalles del proyecto/);
  assert.match(startSource, /aria-expanded=\{detailsOpen\}/);
  assert.match(startSource, /aria-controls="adv-project-details"/);
  assert.match(startSource, /id="adv-project-details"/);
  assert.match(startSource, /aria-hidden=\{!detailsOpen\}/);
  assert.doesNotMatch(startSource, /detailsOpen\s*&&\s*\(/);
  assert.match(startSource, /legend="Funcionalidades que ya imaginás"/);
  assert.match(startSource, /aria-invalid=\{invalid\}/);
  assert.match(startSource, /invalid=\{Boolean\(errors\.funcionalidades\)\}/);
  assert.match(startSource, /id="adv-functionality-error"/);
  assert.match(startSource, /role="alert"/);
  assert.match(startSource, /functionalityGroupRef\.current\?\.focus/);
  assert.match(configuratorSource, /validateAdvisorStart\(/);
  assert.match(configuratorSource, /initialData\.funcionalidades/);
  assert.equal(hasAdvisorStartDetailErrors({}), false);
  assert.equal(
    hasAdvisorStartDetailErrors({ tipoProyecto: "Seleccioná una opción" }),
    true,
  );
  assert.equal(
    hasAdvisorStartDetailErrors({ procesoActual: "Contanos el proceso" }),
    false,
  );
  assert.match(
    styles,
    /\.adv-field--idea textarea\s*\{[^}]*min-height:\s*210px[^}]*border:\s*1px solid var\(--adv-line\)[^}]*font-size:\s*16px[^}]*line-height:\s*1\.6/s,
  );
  assert.match(
    styles,
    /\.adv-project-details__toggle:focus-visible\s*\{[^}]*outline:/s,
  );
});

test("client confirmation separates functionality, description, origin and state", async () => {
  const [source, styles] = await Promise.all([
    readFile(confirmationUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /getStoryFunctionalityLabel\(story\)/);
  assert.match(source, /className="adv-confirm__functionality"/);
  assert.match(source, />Descripción de la HU</);
  assert.match(source, /Origen:/);
  assert.match(source, /Estado:/);
  assert.doesNotMatch(source, /Detalle de solicitud|Cantidad aproximada|Presupuesto/);
  assert.match(styles, /\.adv-confirm__functionality\s*\{[^}]*color:/s);
  assert.match(styles, /\.adv-confirm__label\s*\{[^}]*text-transform:\s*uppercase/s);
});

test("advisor workspace keeps acceptance feedback visible after the suggestion list changes", async () => {
  const source = await readFile(workspaceUrl, "utf8");

  assert.match(source, /suggestionFeedback/);
  assert.match(
    source,
    /className="adv-suggestion-feedback adv-feedback-pulse"/,
  );
  assert.match(source, /role="status"/);
});

test("current functionality uses a distinct dark strip without nested card markup", async () => {
  const [source, styles] = await Promise.all([
    readFile(workspaceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /className="adv-current"/);
  assert.match(styles, /\.adv-current\s*\{[^}]*background:/s);
  assert.match(styles, /\.adv-current\s*\{[^}]*border:/s);
  assert.doesNotMatch(source, /adv-current[^>]*>\s*<section/s);
});

test("story rows render the latest story text supplied by advisor state", () => {
  const refinedText =
    "Como empleado, quiero registrar ventas con productos y total, para controlar lo vendido cada día.";
  const markup = renderToStaticMarkup(
    React.createElement(AdvisorStoryText, {
      story: { id: "hu-1", texto: refinedText },
    }),
  );

  assert.equal(markup, `<p>${refinedText}</p>`);
});

test("project configurator applies acknowledgements and merges the complete story list", async () => {
  const source = await readFile(configuratorUrl, "utf8");

  assert.match(source, /applyIntegratedAnswers\(current, data\.integradas\)/);
  assert.match(source, /mergeAdvisorHistories\(current, data\.historias\)/);
});

test("degraded provider rounds explain temporary unavailability without internal codes", () => {
  const markup = renderToStaticMarkup(
    React.createElement(AdvisorDegradedNotice, {
      degraded: true,
      loading: false,
      onRetry: () => {},
      onFallback: () => {},
      onClose: () => {},
      reason: "provider",
    }),
  );

  assert.match(markup, /El servicio de IA no está disponible temporalmente\./);
  assert.match(
    markup,
    /Podés reintentar más tarde o continuar sin el asesor\./,
  );
  assert.doesNotMatch(markup, /El asesor no pudo generar preguntas válidas/);
  assert.doesNotMatch(markup, /provider/i);
  assert.doesNotMatch(markup, /503|UNAVAILABLE|Motivo:/);
  assert.match(markup, /Reintentar/);
  assert.match(markup, /Continuar sin asesor/);
  assert.match(markup, /Ya está, armá el resumen/);
  assert.match(markup, /role="status"/);
});

test("degraded notices differentiate quota, rate limit and timeout", () => {
  const cases = [
    ["quota", "Se alcanzó temporalmente el límite de uso del servicio de IA."],
    [
      "rate_limit",
      "Hay demasiadas solicitudes al servicio de IA en este momento.",
    ],
    ["timeout", "El servicio de IA tardó demasiado en responder."],
  ];

  for (const [reason, expected] of cases) {
    const markup = renderToStaticMarkup(
      React.createElement(AdvisorDegradedNotice, {
        degraded: true,
        loading: false,
        onRetry: () => {},
        onFallback: () => {},
        onClose: () => {},
        reason,
      }),
    );

    assert.match(markup, new RegExp(expected.replace(".", "\\.")));
    assert.doesNotMatch(markup, /Motivo:/);
    assert.doesNotMatch(markup, /provider/i);
  }
});

test("degraded validation rounds explain the response could not be processed", () => {
  const markup = renderToStaticMarkup(
    React.createElement(AdvisorDegradedNotice, {
      degraded: true,
      loading: false,
      onRetry: () => {},
      onFallback: () => {},
      onClose: () => {},
      reason: "validation",
    }),
  );

  assert.match(
    markup,
    /No pudimos procesar correctamente la respuesta del asesor\./,
  );
  assert.doesNotMatch(markup, /Motivo:/);
  assert.match(markup, /Reintentar/);
});

test("option and mixed questions render checkboxes with Otra and exclusive No sé", () => {
  const markup = renderToStaticMarkup(
    React.createElement(AdvisorQuestion, {
      question: {
        id: "q-benefits",
        aspecto: "beneficio",
        tipo: "mixta",
        texto: "¿Qué beneficios esperás?",
        opciones: ["Menos errores", "Más rapidez"],
      },
      number: 1,
      total: 4,
      value: { selected: [], otherSelected: false, other: "", noSabe: false },
      onChange: () => {},
    }),
  );

  assert.match(markup, /<fieldset/);
  assert.match(
    markup,
    /<legend>[\s\S]*¿Qué beneficios esperás\?[\s\S]*<\/legend>/,
  );
  assert.match(markup, /Pregunta 1 de 4/);
  assert.match(markup, />Beneficio</);
  assert.equal((markup.match(/type="checkbox"/g) || []).length, 4);
  assert.match(markup, />Otra</);
  assert.match(markup, />No sé</);
  assert.doesNotMatch(markup, /type="radio"/);
});

test("advisor motion timings are centralized in editable CSS variables", async () => {
  const styles = await readFile(stylesUrl, "utf8");
  const variables = [
    "screen",
    "question",
    "stagger",
    "story",
    "flash",
    "feedback",
    "check",
    "button",
    "thinking",
  ];

  for (const name of variables) {
    const occurrences =
      styles.match(new RegExp(`--adv-motion-${name}`, "g")) || [];
    assert.ok(occurrences.length >= 2, `${name} must be declared and consumed`);
  }

  const withoutDeclarations = styles.replace(
    /--adv-motion-[\w-]+\s*:\s*[^;]+;/g,
    "",
  );
  assert.doesNotMatch(withoutDeclarations, /\b\d+(?:\.\d+)?(?:ms|s)\b/);
});

test("question fieldsets and desktop columns form distinct compact visual areas", async () => {
  const styles = await readFile(stylesUrl, "utf8");

  assert.match(styles, /\.adv-shell\s*\{[^}]*max-width:\s*1720px/s);
  assert.match(
    styles,
    /\.adv-split\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.1fr\)\s+minmax\(0,\s*0\.9fr\)[^}]*gap:\s*clamp\(40px,\s*5vw,\s*96px\)/s,
  );
  assert.match(styles, /\.adv-shell\s*\{[^}]*box-sizing:\s*border-box/s);
  assert.match(styles, /\.adv-main\s*\{[^}]*overflow-x:\s*clip/s);
  assert.match(styles, /\.adv-split\s*\{[^}]*min-width:\s*0/s);
  assert.match(
    styles,
    /\.adv-questions,\s*\.adv-stories\s*\{[^}]*min-width:\s*0/s,
  );
  assert.match(styles, /\.adv-question\s*\{[^}]*box-shadow:\s*inset/s);
  assert.match(styles, /\.adv-question legend\s*\{[^}]*float:\s*left/s);
  assert.match(
    styles,
    /@media\s*\(max-width:\s*900px\)[\s\S]*?\.adv-split\s*\{[^}]*display:\s*block[^}]*padding:\s*0/s,
  );
});

test("story rows expose distinct visual states and a prominent current story", async () => {
  const [source, styles] = await Promise.all([
    readFile(workspaceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /is-status-\$\{story\.estado\}/);
  assert.match(
    styles,
    /\.adv-story\.is-status-entendida[^}]*background:[^}]*box-shadow:/s,
  );
  assert.match(
    styles,
    /\.adv-story\.is-status-con_pendientes[^}]*background:[^}]*box-shadow:/s,
  );
  assert.match(
    styles,
    /\.adv-story\.is-status-supuesta[^}]*background:[^}]*box-shadow:/s,
  );
  assert.match(
    styles,
    /\.adv-story\.is-focused[^}]*background:[^}]*box-shadow:\s*inset 0 0 0 2px var\(--adv-accent\)/s,
  );
  assert.match(
    styles,
    /\.adv-story\.is-focused \.adv-badge--en_detalle[^}]*background:/s,
  );
});

test("question list identity depends on the round and stable question IDs only", async () => {
  const source = await readFile(workspaceUrl, "utf8");

  assert.match(source, /key=\{round\.renderId\}/);
  assert.match(source, /key=\{question\.id\}/);
  assert.doesNotMatch(source, /key=\{[^}]*(draft|answer|value|selected)/i);
  assert.match(source, /getPropertyValue\(variable\)/);
  assert.match(source, /getMotionDuration\("--adv-motion-flash", 1600\)/);
  assert.match(source, /clearTimeout\(timeout\)/);
  assert.match(
    source,
    /serializeAdvisorAnswer\(question, drafts\[question\.id\]\)/,
  );
  assert.match(source, /disabled=\{!canSubmit\}/);
});

test("advisor CSS keeps visible defaults, backwards entries, and reduced motion", async () => {
  const styles = await readFile(stylesUrl, "utf8");
  const withoutKeyframes = styles.replace(/@keyframes[\s\S]*?\n}\n/g, "");

  assert.doesNotMatch(withoutKeyframes, /opacity\s*:\s*0(?:[;\s]|$)/);
  assert.doesNotMatch(styles, /animation-fill-mode\s*:\s*(?:both|forwards)/);
  assert.match(styles, /animation-fill-mode\s*:\s*backwards/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(
    styles,
    /\.adv-screen\s*\{[^}]*background:\s*var\(--adv-workspace\)/s,
  );
  assert.doesNotMatch(
    styles,
    /background(?:-color)?\s*:\s*(?:#fff(?:fff)?|white)\b/i,
  );
});

test("advisor flow files do not import Framer Motion", async () => {
  const componentsUrl = new URL(
    "../src/components/ProjectConfigurator/",
    import.meta.url,
  );
  const files = (await readdir(componentsUrl)).filter((name) =>
    /\.(?:js|jsx)$/.test(name),
  );
  const sources = await Promise.all(
    files.map((name) => readFile(new URL(name, componentsUrl), "utf8")),
  );

  assert.ok(
    sources.every((source) => !/from\s+["']framer-motion["']/.test(source)),
  );
});

test("only the thinking indicator uses an infinite advisor animation", async () => {
  const styles = await readFile(stylesUrl, "utf8");
  const infiniteRules =
    styles.match(/[^{}]+\{[^{}]*\binfinite\b[^{}]*\}/g) || [];

  assert.equal(infiniteRules.length, 1);
  assert.match(infiniteRules[0], /\.adv-thinking/);
});
