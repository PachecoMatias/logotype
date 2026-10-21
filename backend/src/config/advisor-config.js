import { companyContext } from './company-context.js';

// Questions are generated only for these editable requirement aspects, in this order.
export const aspectos = [
  'quien_la_usa',
  'beneficio',
  'comportamiento',
  'datos_previos',
  'volumen',
  'restricciones',
];

// Session and response limits. Adjust them here without changing advisor logic.
export const topeFuncionalidades = 6;
export const maxPreguntasPorRonda = 4;
export const maxSugerenciasPorRonda = 2;
export const maxHistorias = 12;
export const maxLargoIdea = 3000;
export const maxLargoHistoria = 400;
export const maxLargoRespuesta = 600;
export const maxRespuestas = 60;
export const maxRondasSesion = 15;

// Public endpoint traffic limit, tracked in memory per IP address.
export const limiteIp = { ventanaMs: 3_600_000, max: 40 };

// Explicit projection: never expose the rest of the trusted internal company context.
export const contextoPublico = {
  servicios: [...companyContext.servicios],
  fueraDeAlcance: [...companyContext.fueraDeAlcance],
};
