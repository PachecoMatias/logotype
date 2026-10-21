const relatedFeatures = {
  'Gestión de usuarios': [
    'Login y autenticación',
    'Roles y permisos',
    'Notificaciones',
  ],
  'Login y autenticación': ['Roles y permisos', 'Gestión de usuarios'],
  'Roles y permisos': ['Gestión de usuarios', 'Login y autenticación'],
  'Gestión de clientes': [
    'Gestión de ventas',
    'Gestión de pedidos',
    'Notificaciones',
  ],
  'Gestión de productos': [
    'Gestión de stock',
    'Gestión de proveedores',
    'Gestión de ventas',
  ],
  'Gestión de proveedores': [
    'Gestión de compras',
    'Gestión de stock',
    'Reportes y estadísticas',
  ],
  'Gestión de ventas': [
    'Facturación',
    'Gestión de clientes',
    'Reportes y estadísticas',
  ],
  'Gestión de compras': [
    'Gestión de proveedores',
    'Gestión de stock',
    'Reportes y estadísticas',
  ],
  Facturación: [
    'Gestión de ventas',
    'Gestión de clientes',
    'Reportes y estadísticas',
  ],
  'Gestión de stock': [
    'Gestión de proveedores',
    'Gestión de compras',
    'Reportes y estadísticas',
  ],
  'Gestión de turnos': ['Notificaciones', 'Gestión de clientes', 'Dashboard'],
  'Gestión de pedidos': ['Notificaciones', 'Gestión de clientes'],
  'Reportes y estadísticas': [
    'Dashboard',
    'Base de datos',
    'Carga de archivos',
  ],
  Dashboard: ['Reportes y estadísticas', 'Notificaciones'],
  Notificaciones: [
    'Gestión de usuarios',
    'Gestión de pedidos',
    'Gestión de turnos',
  ],
  'Integración con otras plataformas': [
    'API',
    'Base de datos',
    'Notificaciones',
  ],
  API: [
    'Integración con otras plataformas',
    'Base de datos',
    'Login y autenticación',
  ],
  'Base de datos': ['API', 'Reportes y estadísticas', 'Carga de archivos'],
  'Carga de archivos': [
    'Base de datos',
    'Gestión de productos',
    'Sistema de tickets',
  ],
  'Sistema de tickets': [
    'Gestión de usuarios',
    'Notificaciones',
    'Reportes y estadísticas',
  ],
}

function nextStage(histories) {
  return String(histories.length + 1)
}

export function getRelatedFeatures(selectedFeatures) {
  const selected = new Set(selectedFeatures)
  const suggestions = []

  for (const feature of selectedFeatures) {
    for (const related of relatedFeatures[feature] || []) {
      if (!selected.has(related) && !suggestions.includes(related))
        suggestions.push(related)
    }
  }

  return suggestions.slice(0, 6)
}

export function addFeatureStory(histories, functionality, createId) {
  const story = {
    id: createId(),
    texto: `Como usuario, quiero usar ${functionality.toLocaleLowerCase('es')}, para facilitar mi trabajo.`,
    estado: 'sugerida_ia',
    bloqueada: false,
    etapa: nextStage(histories),
    aDetallar: false,
    funcionalidad: functionality,
  }

  return { histories: [...histories, story], story }
}

export function addManualStory(histories, text, createId) {
  const story = {
    id: createId(),
    texto: text.trim(),
    estado: 'editada_cliente',
    bloqueada: true,
    etapa: nextStage(histories),
    aDetallar: false,
    funcionalidad: null,
  }

  return { histories: [...histories, story], story }
}

export function addSuggestedStory(histories, text, createId) {
  const story = {
    id: createId(),
    texto: text.trim(),
    estado: 'sugerida_ia',
    bloqueada: false,
    etapa: nextStage(histories),
    aDetallar: false,
    funcionalidad: null,
  }

  return { histories: [...histories, story], story }
}

export function editStory(histories, answers, storyId, text) {
  return {
    histories: histories.map((story) =>
      story.id === storyId
        ? {
            ...story,
            texto: text.trim(),
            estado: 'editada_cliente',
            bloqueada: true,
            aDetallar: false,
          }
        : story
    ),
    answers: answers.filter((answer) => answer.historiaId !== storyId),
  }
}

export function deleteStory(histories, answers, storyId) {
  return {
    histories: histories.filter((story) => story.id !== storyId),
    answers: answers.filter((answer) => answer.historiaId !== storyId),
  }
}
