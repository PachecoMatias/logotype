import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_SERVICE_UNAVAILABLE_MESSAGE,
  ApiRequestError,
  apiRequest,
  requestAdvisorRound,
} from "../src/utils/api.js";

test("apiRequest preserves public status and code for advisor fallback decisions", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "ADVISOR_UNAVAILABLE",
          message: "El asesor no está disponible.",
        },
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );

  try {
    await assert.rejects(apiRequest("/api/asesor/ronda"), (error) => {
      assert.ok(error instanceof ApiRequestError);
      assert.equal(error.status, 503);
      assert.equal(error.code, "ADVISOR_UNAVAILABLE");
      assert.equal(error.isNetworkError, false);
      return true;
    });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("requestAdvisorRound preserves valid suggestions from the endpoint response", async () => {
  const previousFetch = globalThis.fetch;
  const suggestions = [
    {
      id: "sugerencia-1",
      tipo: "mejora",
      texto: "Podrías importar los productos iniciales desde una planilla.",
    },
  ];
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        data: {
          historias: [],
          foco: null,
          preguntas: [],
          sugerencias: suggestions,
          progreso: { detalladas: 0, total: 0, completas: 0, tope: 6 },
          completo: false,
          motivoCierre: null,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  try {
    const round = await requestAdvisorRound({ sesionId: "session-test" });

    assert.deepEqual(round.sugerencias, suggestions);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("analysis and backlog normalize legacy API copy while preserving status and code", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: false,
        error: { code: "AI_ANALYSIS_FAILED", message: "AI analysis failed" },
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );

  try {
    for (const path of [
      "/api/proyectos/41/analizar",
      "/api/proyectos/41/backlog",
    ]) {
      await assert.rejects(apiRequest(path, { method: "POST" }), (error) => {
        assert.ok(error instanceof ApiRequestError);
        assert.equal(error.message, AI_SERVICE_UNAVAILABLE_MESSAGE);
        assert.equal(error.status, 502);
        assert.equal(error.code, "AI_ANALYSIS_FAILED");
        assert.equal(error.isNetworkError, false);
        return true;
      });
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("analysis and backlog network failures use the public temporary-unavailability copy", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError("network failed");
  };

  try {
    for (const path of [
      "/api/proyectos/41/analizar",
      "/api/proyectos/41/backlog",
    ]) {
      await assert.rejects(apiRequest(path, { method: "POST" }), (error) => {
        assert.ok(error instanceof ApiRequestError);
        assert.equal(error.message, AI_SERVICE_UNAVAILABLE_MESSAGE);
        assert.equal(error.status, null);
        assert.equal(error.code, null);
        assert.equal(error.isNetworkError, true);
        return true;
      });
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("non-AI API failures keep their existing public message", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: false,
        error: { code: "PROJECT_NOT_FOUND", message: "Project not found" },
      }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );

  try {
    await assert.rejects(apiRequest("/api/proyectos/41"), (error) => {
      assert.equal(error.message, "Project not found");
      assert.equal(error.status, 404);
      assert.equal(error.code, "PROJECT_NOT_FOUND");
      return true;
    });
  } finally {
    globalThis.fetch = previousFetch;
  }
});
