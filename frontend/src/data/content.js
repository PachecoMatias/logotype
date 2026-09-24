export const services = [
  {
    id: 'desarrollo',
    icon: '🖥️',
    title: 'Desarrollo de software',
    description:
      'Desarrollo de aplicaciones web y sistemas personalizados adaptados a las necesidades de cada organización.',
  },
  {
    id: 'comercios',
    icon: '🏪',
    title: 'Soluciones para comercios',
    description:
      'Herramientas digitales para administrar operaciones, clientes, productos y servicios.',
  },
  {
    id: 'ayuda',
    icon: '🛠️',
    title: 'Mesa de ayuda',
    description: 'Gestión de incidentes y soporte técnico para nuestros clientes.',
  },
  {
    id: 'cloud',
    icon: '☁️',
    title: 'Soluciones Cloud',
    description:
      'Implementación y despliegue de aplicaciones utilizando infraestructura en la nube.',
  },
]

export const problems = [
  'Dificultad para gestionar los incidentes reportados por los comercios.',
  'Falta de centralización de la información de clientes y solicitudes.',
  'Seguimiento manual de los tickets.',
  'Falta de indicadores para conocer el estado de la atención.',
]

export const solutions = [
  'Sistema web centralizado de gestión.',
  'Registro y seguimiento de tickets.',
  'Gestión de clientes y usuarios.',
  'Panel de indicadores y estadísticas.',
  'Control de estados y prioridades.',
]

export const sidebarLinks = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'clientes', icon: '👥', label: 'Clientes' },
  { id: 'tickets', icon: '🎫', label: 'Tickets' },
  { id: 'servicios', icon: '🛠', label: 'Servicios' },
  { id: 'reportes', icon: '📈', label: 'Reportes' },
  { id: 'configuracion', icon: '⚙', label: 'Configuración' },
]

export const stats = [
  { id: 'clientes', label: 'Clientes', value: 48 },
  { id: 'abiertos', label: 'Tickets abiertos', value: 12 },
  { id: 'proceso', label: 'En proceso', value: 7 },
  { id: 'resueltos', label: 'Resueltos', value: 156 },
]

export const tickets = [
  {
    id: '#00125',
    cliente: 'Comercio Norte',
    problema: 'Error de facturación',
    prioridad: 'Alta',
    estado: 'open',
    estadoLabel: 'Abierto',
  },
  {
    id: '#00124',
    cliente: 'Supermercado Tucumán',
    problema: 'Problema de acceso',
    prioridad: 'Media',
    estado: 'pending',
    estadoLabel: 'En proceso',
  },
  {
    id: '#00123',
    cliente: 'Comercial Norte',
    problema: 'Error en reporte',
    prioridad: 'Baja',
    estado: 'closed',
    estadoLabel: 'Resuelto',
  },
  {
    id: '#00122',
    cliente: 'Distribuidora Sur',
    problema: 'Falla del sistema',
    prioridad: 'Alta',
    estado: 'open',
    estadoLabel: 'Abierto',
  },
]

export const infrastructure = [
  {
    id: 'estaciones',
    icon: '💻',
    title: 'Estaciones',
    description: 'Equipos HP para perfiles administrativos y de alto rendimiento.',
    price: '$28.575.000',
  },
  {
    id: 'servidor',
    icon: '🖥️',
    title: 'Servidor',
    description: 'Servidor físico con Ubuntu Server, RAID 1 y gestión remota.',
    price: '$7.255.000',
  },
  {
    id: 'cloud',
    icon: '☁️',
    title: 'Cloud',
    description: 'Infraestructura AWS para despliegue, bases de datos y almacenamiento.',
    price: 'USD 75/mes',
  },
  {
    id: 'redes',
    icon: '🌐',
    title: 'Redes',
    description: 'Infraestructura LAN con Ubiquiti UniFi y conexión WAN redundante.',
    price: '300 Mbps',
  },
]

export const conclusions = [
  'Durante el desarrollo del proyecto integrador se diseñó una propuesta tecnológica completa para Logotype, contemplando tanto los aspectos organizacionales como la infraestructura informática necesaria para su funcionamiento.',
  'El análisis realizado permitió seleccionar equipamiento, software, servicios cloud, herramientas de desarrollo y soluciones de conectividad considerando criterios de costo, rendimiento, seguridad, escalabilidad y soporte.',
  'Finalmente, el prototipo presentado permite visualizar cómo la solución informática puede centralizar la gestión de clientes, tickets, servicios e indicadores, contribuyendo a mejorar la eficiencia y calidad del servicio ofrecido por Logotype.',
]

export const navLinks = [
  { id: 'empresa', label: 'Empresa' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'problematica', label: 'Proyecto' },
  { id: 'sistema', label: 'Sistema' },
  { id: 'infraestructura', label: 'Infraestructura' },
  { id: 'conclusion', label: 'Conclusiones' },
]
