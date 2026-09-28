import { useEffect, useState } from 'react'
import ProjectCard from './ProjectCard.jsx'
import { apiRequest } from '../../utils/api.js'

function PanelSolicitudes({ onSelectProject }) {
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false

    const cargarProyectos = async () => {
      setLoading(true)
      setError(null)
      try {
        const projects = await apiRequest('/api/proyectos')

        if (!cancelado) {
          setProyectos(Array.isArray(projects) ? projects : [])
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message || 'Error de red al cargar las solicitudes.')
        }
      } finally {
        if (!cancelado) {
          setLoading(false)
        }
      }
    }

    cargarProyectos()

    return () => {
      cancelado = true
    }
  }, [])

  return (
    <section className="panel-section">
      <div className="container">
        <div className="panel-header">
          <h2>Solicitudes recibidas</h2>
          <p>Panel interno — proyectos enviados a través del configurador.</p>
        </div>

        {loading && <p className="panel-state-msg">Cargando solicitudes...</p>}

        {!loading && error && (
          <p className="panel-state-msg panel-state-error">Ocurrió un error: {error}</p>
        )}

        {!loading && !error && proyectos.length === 0 && (
          <p className="panel-state-msg">No hay solicitudes recibidas todavía.</p>
        )}

        {!loading && !error && proyectos.length > 0 && (
          <div className="panel-project-grid">
            {proyectos.map((p) => (
              <ProjectCard key={p.id} project={p} onClick={onSelectProject} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default PanelSolicitudes
