/**
 * Trusted business context supplied to project analysis.
 * Keep this object factual and editable: Gemini must not invent company capabilities.
 */
export const companyContext = {
  empresa: 'Logotype',
  descripcion: 'Desarrollo de software y soluciones digitales para empresas y comercios.',
  metodologia: {
    nombre: 'Scrum',
    duracionSprintSemanas: 3,
    estimacion: 'Fibonacci',
  },
  servicios: [
    'Desarrollo de software a medida',
    'Soluciones para comercios',
    'Mesa de ayuda',
    'Soluciones cloud (AWS)',
  ],
  equipo: {
    total: 12,
    roles: {
      Frontend: 3,
      Backend: 3,
      QA: 2,
      Ciberseguridad: 1,
      'Analista de requerimientos': 2,
      'Project Manager': 1,
    },
  },
  capacidadPorProyecto: {
    Frontend: 2,
    Backend: 2,
    QA: 1,
    Ciberseguridad: 1,
    'Analista de requerimientos': 1,
    'Project Manager': 1,
  },
  proyectosEnParalelo: 2,
  stack: ['React', 'Node.js con Express', 'MySQL', 'APIs REST', 'n8n', 'AWS', 'C#'],
  usoCSharp: 'Componentes de escritorio o servicios.',
  plataformasSinEquipoDedicado: ['Android', 'iOS'],
  criterioPlataformasSinEquipoDedicado: 'Se evalúan caso a caso; se prefiere web responsive o PWA.',
  cuelloDeBotella: 'Ciberseguridad (1 sola persona).',
  funcionalidadesSensibles: [
    'Login y autenticación',
    'Roles y permisos',
    'Facturación',
    'Integración con otras plataformas',
    'API',
  ],
  rubrosSensibles: ['Salud', 'Finanzas'],
  presupuestoMinimoUsdPorTipo: {
    web: 1400,
    gestion: 2500,
    ecommerce: 3000,
    api: 2000,
    movil: 4000,
    personalizada: 3000,
  },
  tamanos: {
    chico: [4, 8],
    mediano: [8, 16],
    grande: [16, 32],
  },
  fueraDeAlcance: [
    'Hardware o infraestructura física',
    'Videojuegos',
    'Sistemas de misión crítica o regulados sin acuerdo previo',
  ],
};
