import React from "react";

import {
  hasAdvisorDraftAnswer,
  toggleAdvisorOption,
  toggleAdvisorUnknown,
} from "../../utils/advisorState.js";

const OTHER_LIMIT = 250;
const ASPECT_LABELS = {
  quien_la_usa: "Quién la usa",
  beneficio: "Beneficio",
  comportamiento: "Comportamiento",
  datos_previos: "Datos previos",
  volumen: "Volumen",
  restricciones: "Restricciones",
  aclaracion: "Aclaración",
};

function optionLabel({ checked, label, onChange }) {
  return React.createElement(
    "label",
    { className: "adv-choice" },
    React.createElement("input", {
      type: "checkbox",
      checked,
      onChange,
    }),
    React.createElement("span", null, label),
  );
}

export function AdvisorQuestion({
  question,
  number,
  total,
  value = {},
  onChange,
  inputRef,
}) {
  const optionQuestion =
    question.tipo === "opcion" || question.tipo === "mixta";
  const answered = hasAdvisorDraftAnswer(question, value);
  const children = [
    React.createElement(
      "legend",
      { key: "legend" },
      React.createElement(
        "span",
        { className: "adv-question__number" },
        `Pregunta ${number} de ${total}`,
      ),
      React.createElement(
        "span",
        { className: "adv-question__aspect" },
        ASPECT_LABELS[question.aspecto] ||
          question.aspecto?.replaceAll("_", " ") ||
          "Detalle",
      ),
      React.createElement(
        "span",
        { className: "adv-question__text" },
        question.texto,
      ),
      answered
        ? React.createElement(
            "span",
            { className: "adv-question__done", "aria-label": "Respondida" },
            "✓",
          )
        : null,
    ),
  ];

  if (optionQuestion) {
    const choices = question.opciones.map((option) =>
      React.cloneElement(
        optionLabel({
          checked: !value.noSabe && (value.selected || []).includes(option),
          label: option,
          onChange: () => onChange(toggleAdvisorOption(value, option)),
        }),
        { key: option },
      ),
    );
    choices.push(
      React.cloneElement(
        optionLabel({
          checked: !value.noSabe && Boolean(value.otherSelected),
          label: "Otra",
          onChange: () =>
            onChange({
              ...value,
              otherSelected: !value.otherSelected,
              other: value.otherSelected ? "" : value.other || "",
              noSabe: false,
            }),
        }),
        { key: "other" },
      ),
    );
    children.push(
      React.createElement(
        "div",
        { className: "adv-question__options", key: "options" },
        choices,
      ),
    );
    if (value.otherSelected && !value.noSabe) {
      children.push(
        React.createElement(
          "label",
          { className: "adv-field adv-question__other", key: "other-input" },
          React.createElement("span", null, "Especificá otra respuesta"),
          React.createElement("input", {
            value: value.other || "",
            maxLength: OTHER_LIMIT,
            required: true,
            onChange: (event) =>
              onChange({ ...value, other: event.target.value, noSabe: false }),
          }),
        ),
      );
    }
  } else {
    children.push(
      React.createElement(
        "label",
        { className: "adv-field", key: "text" },
        React.createElement("span", null, "Tu respuesta"),
        React.createElement("textarea", {
          value: value.noSabe ? "" : value.value || "",
          maxLength: 1600,
          onChange: (event) =>
            onChange({ ...value, value: event.target.value, noSabe: false }),
        }),
      ),
    );
  }

  children.push(
    React.cloneElement(
      optionLabel({
        checked: Boolean(value.noSabe),
        label: "No sé",
        onChange: () => onChange(toggleAdvisorUnknown(value)),
      }),
      { key: "unknown", className: "adv-choice adv-choice--unknown" },
    ),
  );

  return React.createElement(
    "fieldset",
    {
      className: `adv-question adv-enter adv-enter-item${answered ? " is-answered" : ""}`,
      ref: inputRef,
      tabIndex: -1,
      style: { "--i": Math.min(number - 1, 5), "--adv-enter-order": number - 1 },
    },
    children,
  );
}
