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
export const minPreguntasPorHistoria = 4;
export const maxPreguntasPorRonda = 7;
export const maxSugerenciasPorRonda = 2;
export const maxHistorias = 12;
export const maxLargoIdea = 3000;
export const maxLargoProcesoActual = 2000;
export const maxLargoHistoria = 400;
export const maxLargoRespuesta = 1600;
export const maxLargoObjetivo = 200;
export const maxObjetivos = 5;
export const maxRespuestas = 60;
export const maxRondasSesion = 15;
export const reparacionFaltantes = true;
export const umbralGroundingSugerencias = 0.6;
export const advisorMaxOutputTokens = 16_384;
export const advisorThinkingBudget = 1024;

// Catalog names are grounding vocabulary only. Related-feature selection stays client-owned.
export const funcionalidadesCatalogo = [
  'Gestión de usuarios',
  'Login y autenticación',
  'Roles y permisos',
  'Gestión de clientes',
  'Gestión de productos',
  'Gestión de proveedores',
  'Gestión de ventas',
  'Gestión de compras',
  'Facturación',
  'Gestión de stock',
  'Gestión de turnos',
  'Gestión de pedidos',
  'Reportes y estadísticas',
  'Dashboard',
  'Notificaciones',
  'Integración con otras plataformas',
  'API',
  'Base de datos',
  'Carga de archivos',
  'Sistema de tickets',
];

// Public endpoint traffic limit, tracked in memory per IP address.
export const limiteIp = { ventanaMs: 3_600_000, max: 40 };

// Explicit projection: never expose the rest of the trusted internal company context.
export const contextoPublico = {
  servicios: [...companyContext.servicios],
  fueraDeAlcance: [...companyContext.fueraDeAlcance],
};
