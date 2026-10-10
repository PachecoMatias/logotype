import { useEffect, useState } from 'react'
import ProjectCard from './ProjectCard.jsx'
import { apiRequest } from '../../utils/api.js'
import '../../styles/panel.css'

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
    <section className="adm-section">
      <div className="adm-container">
        <div className="adm-page-head">
          <span className="adm-eyebrow">Panel interno</span>
          <h2 className="adm-page-title">Solicitudes recibidas</h2>
          <p className="adm-page-sub">Proyectos enviados a través del configurador.</p>
        </div>

        {loading && (
          <div className="adm-skel" aria-hidden="true">
            {[0, 1, 2, 3].map((fila) => (
              <div className="adm-skel__row" key={fila}>
                <span className="adm-skel__bar adm-skel__bar--sm" />
                <span className="adm-skel__bar" />
                <span className="adm-skel__bar" />
                <span className="adm-skel__bar" />
                <span className="adm-skel__bar adm-skel__bar--sm" />
                <span className="adm-skel__bar adm-skel__bar--sm" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="adm-state adm-state--box adm-state--error">
            <div>
              <p className="adm-state__title">No se pudieron cargar las solicitudes</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && proyectos.length === 0 && (
          <div className="adm-state adm-state--box">
            <div>
              <p className="adm-state__title">No hay solicitudes todavía</p>
              <p>Cuando se envíe el configurador, la solicitud va a aparecer en esta lista.</p>
            </div>
          </div>
        )}

        {!loading && !error && proyectos.length > 0 && (
          <div className="adm-list">
            <div className="adm-list__head" aria-hidden="true">
              <span>Código</span>
              <span>Empresa</span>
              <span>Contacto</span>
              <span>Tipo</span>
              <span>Fecha</span>
              <span>Estado</span>
            </div>
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
