export const rubros = [
  'Comercio',
  'Industria',
  'Servicios',
  'Salud',
  'Educación',
  'Finanzas',
  'Tecnología',
  'Otro',
]

export const projectTypes = [
  {
    id: 'web',
    icon: '🌐',
    title: 'Aplicación web',
    description: 'Sistemas accesibles desde cualquier navegador.',
  },
  {
    id: 'movil',
    icon: '📱',
    title: 'Aplicación móvil',
    description: 'Aplicaciones para Android y/o iOS.',
  },
  {
    id: 'gestion',
    icon: '🗂️',
    title: 'Sistema de gestión',
    description: 'Software para administrar procesos internos de tu empresa.',
  },
  {
    id: 'ecommerce',
    icon: '🛒',
    title: 'E-commerce',
    description: 'Plataformas para vender productos o servicios online.',
  },
  {
    id: 'api',
    icon: '🔌',
    title: 'API / Backend',
    description: 'Servicios y APIs para integrar sistemas y aplicaciones.',
  },
  {
    id: 'personalizada',
    icon: '✨',
    title: 'Solución personalizada',
    description: 'Una solución adaptada completamente a tus necesidades.',
  },
]

export const improvementGoals = [
  'Reducir tiempos',
  'Automatizar tareas',
  'Centralizar información',
  'Mejorar la atención al cliente',
  'Obtener estadísticas',
  'Reducir errores',
  'Mejorar la seguridad',
  'Aumentar las ventas',
  'Otro',
]

export const featuresList = [
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
  'Otra',
]

export const platforms = ['Web', 'Android', 'iOS', 'Windows / Desktop']

export const userRanges = ['1 - 10', '10 - 50', '50 - 100', '100 - 500', 'Más de 500']

export const yesNoUnsure = ['Sí', 'No', 'No estoy seguro']

export const userTypes = ['Administrador', 'Empleado', 'Cliente', 'Supervisor', 'Otro']

export const budgetRanges = [
  'Menos de USD 1.000',
  'USD 1.000 - 5.000',
  'USD 5.000 - 10.000',
  'Más de USD 10.000',
  'Todavía no lo definimos',
]

export const timelineRanges = [
  'Lo antes posible',
  '1 - 3 meses',
  '3 - 6 meses',
  'Más de 6 meses',
  'No tenemos una fecha definida',
]

export const configuratorSteps = [
  { id: 'empresa', label: 'Empresa' },
  { id: 'proyecto', label: 'Proyecto' },
  { id: 'problema', label: 'Problema' },
  { id: 'funcionalidades', label: 'Funcionalidades' },
  { id: 'alcance', label: 'Alcance' },
  { id: 'presupuesto', label: 'Presupuesto' },
  { id: 'resumen', label: 'Resumen' },
]

export const initialProjectData = {
  empresa: {
    nombreEmpresa: '',
    contacto: '',
    email: '',
    telefono: '',
    rubro: '',
    rubroOtro: '',
  },
  proyecto: {
    tipoProyecto: '',
  },
  problema: {
    problemaActual: '',
    procesoActual: '',
    objetivos: [],
    objetivosOtro: '',
  },
  funcionalidades: {
    seleccionadas: [],
    otra: '',
  },
  alcance: {
    plataformas: [],
    cantidadUsuarios: '',
    necesitaTiposUsuario: '',
    tiposUsuario: [],
    tiposUsuarioOtro: '',
  },
  presupuesto: {
    presupuesto: '',
    plazo: '',
    infoAdicional: '',
  },
}
