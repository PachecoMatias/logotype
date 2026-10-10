function StatusBadge({ estado }) {
  const labels = {
    nuevo: 'Nuevo',
    analizado: 'Analizado',
    planificado: 'Planificado',
  }

  const clase = labels[estado] ? estado : 'nuevo'
  const label = labels[estado] || estado || 'Desconocido'

  return <span className={`adm-badge adm-badge--${clase}`}>{label}</span>
}

export default StatusBadge
