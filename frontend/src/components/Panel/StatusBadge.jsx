function StatusBadge({ estado }) {
  const labels = {
    nuevo: 'Nuevo',
    analizado: 'Analizado',
    planificado: 'Planificado',
  }

  const clase = labels[estado] ? estado : 'nuevo'
  const label = labels[estado] || estado || 'Desconocido'

  return <span className={`status ${clase}`}>{label}</span>
}

export default StatusBadge