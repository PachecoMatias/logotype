import StatusBadge from './StatusBadge.jsx'

function ProjectCard({ project, onClick }) {
  const empresa = project?.payload?.empresa || {}
  const proyecto = project?.payload?.proyecto || {}

  const fecha = project.creadoEn
    ? new Date(project.creadoEn).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—'

  return (
    <button type="button" className="adm-row" onClick={() => onClick(project.id)}>
      <span className="adm-row__code">#{project.id}</span>
      <span className="adm-row__empresa">{empresa.nombreEmpresa || 'Empresa sin nombre'}</span>
      <span className="adm-row__contact">{empresa.contacto || 'Sin contacto registrado'}</span>
      <span className="adm-row__type">{proyecto.tipoProyecto || 'Tipo no especificado'}</span>
      <span className="adm-row__date">{fecha}</span>
      <span className="adm-row__badge">
        <StatusBadge estado={project.estado} />
      </span>
    </button>
  )
}

export default ProjectCard
