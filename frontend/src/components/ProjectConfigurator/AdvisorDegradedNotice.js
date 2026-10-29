import React from "react";

const degradedCopy = {
  provider: {
    title: "El servicio de IA no está disponible temporalmente.",
    detail: "Podés reintentar más tarde o continuar sin el asesor.",
  },
  quota: {
    title: "Se alcanzó temporalmente el límite de uso del servicio de IA.",
    detail: "Podés reintentar más tarde o continuar sin el asesor.",
  },
  rate_limit: {
    title: "Hay demasiadas solicitudes al servicio de IA en este momento.",
    detail: "Podés reintentar más tarde o continuar sin el asesor.",
  },
  timeout: {
    title: "El servicio de IA tardó demasiado en responder.",
    detail: "Podés reintentar o continuar sin el asesor.",
  },
  validation: {
    title: "No pudimos procesar correctamente la respuesta del asesor.",
    detail: "Podés reintentar o continuar sin el asesor.",
  },
  incomplete_questions: {
    title: "No pudimos procesar correctamente la respuesta del asesor.",
    detail: "Podés reintentar o continuar sin el asesor.",
  },
};

const fallbackCopy = {
  title: "El asesor no pudo completar esta ronda.",
  detail: "Podés reintentar o continuar sin el asesor.",
};

function resolveCopy(reason) {
  return degradedCopy[reason] ?? fallbackCopy;
}

export function AdvisorDegradedNotice({
  degraded,
  loading,
  onRetry,
  onFallback,
  onClose,
  reason,
}) {
  if (!degraded) return null;

  const copy = resolveCopy(reason);

  return React.createElement(
    "div",
    { className: "adv-degraded-notice", role: "status" },
    React.createElement(
      "div",
      { className: "adv-degraded-notice__copy" },
      React.createElement(
        "p",
        null,
        React.createElement("strong", null, copy.title),
      ),
      React.createElement("p", null, copy.detail),
    ),
    React.createElement(
      "div",
      { className: "adv-inline-actions" },
      React.createElement(
        "button",
        {
          type: "button",
          className: "adv-button adv-button--line",
          disabled: loading,
          onClick: onRetry,
        },
        loading ? "Reintentando…" : "Reintentar",
      ),
      React.createElement(
        "button",
        {
          type: "button",
          className: "adv-button adv-button--quiet",
          disabled: loading,
          onClick: onFallback,
        },
        "Continuar sin asesor",
      ),
      React.createElement(
        "button",
        {
          type: "button",
          className: "adv-button adv-button--quiet",
          disabled: loading,
          onClick: onClose,
        },
        "Ya está, armá el resumen",
      ),
    ),
  );
}
