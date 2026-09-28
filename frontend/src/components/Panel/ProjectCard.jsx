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
    <button className="card panel-project-card" onClick={() => onClick(project.id)}>
      <div className="panel-project-card-top">
        <h3>{empresa.nombreEmpresa || 'Empresa sin nombre'}</h3>
        <StatusBadge estado={project.estado} />
      </div>
      <p className="panel-project-card-contact">{empresa.contacto || 'Sin contacto registrado'}</p>
      <div className="panel-project-card-meta">
        <span>{proyecto.tipoProyecto || 'Tipo no especificado'}</span>
        <span>{fecha}</span>
      </div>
    </button>
  )
}

export default ProjectCard