import assert from "node:assert/strict";
import test from "node:test";

import { buildAdvisorDetail } from "../src/utils/advisorDetail.js";

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
