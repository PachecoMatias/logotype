import { useEffect, useState } from 'react'
import StatusBadge from './StatusBadge.jsx'
import { apiRequest } from '../../utils/api.js'
import { adaptarHistorias } from '../../utils/backlog.js'

function formatLabel(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
}

function ValorCampo({ valor }) {
  if (valor === null || valor === undefined || valor === '') {
    return <span className="panel-campo-vacio">—</span>
  }

  if (Array.isArray(valor)) {
    if (valor.length === 0) return <span className="panel-campo-vacio">—</span>
    return (
      <ul className="panel-lista-valores">
        {valor.map((item, i) => (
          <li key={i}>
            {typeof item === 'object' && item !== null ? (
              <SeccionPayload titulo={null} datos={item} />
            ) : (
              String(item)
            )}
          </li>
        ))}
      </ul>
    )
  }

  if (typeof valor === 'object') {
    return <SeccionPayload titulo={null} datos={valor} />
  }

  if (typeof valor === 'boolean') {
    return <span>{valor ? 'Sí' : 'No'}</span>
  }

  return <span>{String(valor)}</span>
}

function SeccionPayload({ titulo, datos }) {
  const entradas = Object.entries(datos || {})

  return (
    <div className="panel-payload-seccion">
      {titulo && <h4>{formatLabel(titulo)}</h4>}
      <dl className="panel-payload-lista">
        {entradas.map(([key, value]) => (
          <div className="panel-payload-item" key={key}>
            <dt>{formatLabel(key)}</dt>
            <dd><ValorCampo valor={value} /></dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function AnalisisIA({ analisis }) {
  if (!analisis) return null

  return (
    <div className={`panel-analisis ${analisis.viable ? 'panel-analisis-ok' : 'panel-analisis-no'}`}>
      <div className="panel-analisis-top">
        <h3>Análisis de IA</h3>
        <span className={`status ${analisis.viable ? 'open' : 'closed'}`}>
          {analisis.viable ? 'Viable' : 'No viable'}
        </span>
      </div>
      <p><strong>Completitud:</strong> {analisis.completitud || '—'}</p>
      {analisis.campos_faltantes && analisis.campos_faltantes.length > 0 && (
        <div>
          <strong>Campos faltantes:</strong>
          <ul className="panel-lista-valores">
            {analisis.campos_faltantes.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
      {analisis.observaciones && <p><strong>Observaciones:</strong> {analisis.observaciones}</p>}
      {analisis.mensaje_para_cliente && (
        <p><strong>Mensaje para el cliente:</strong> {analisis.mensaje_para_cliente}</p>
      )}
    </div>
  )
}

function Backlog({ historias }) {
  if (!historias || historias.length === 0) return null

  const grupos = historias.reduce((acc, h) => {
    const fase = h.fase || 'Sin fase'
    if (!acc[fase]) acc[fase] = []
    acc[fase].push(h)
    return acc
  }, {})

  return (
    <div className="panel-backlog">
      <h3>Backlog generado</h3>
      {Object.entries(grupos).map(([fase, items]) => (
        <div key={fase} className="panel-backlog-fase">
          <h4>{fase}</h4>
          <div className="panel-backlog-grid">
            {items.map((h) => (
              <div className="card panel-historia-card" key={h.id}>
                <div className="panel-historia-top">
                  <span className="panel-chip">{h.prioridad}</span>
                  <span className="panel-chip panel-chip-fib">Fib: {h.estimacion_fibonacci}</span>
                </div>
                <p className="panel-historia-texto">{h.historia_usuario}</p>
                {h.descripcion && <p className="panel-historia-desc">{h.descripcion}</p>}
                {h.criterios_aceptacion && h.criterios_aceptacion.length > 0 && (
                  <div>
                    <strong>Criterios de aceptación</strong>
                    <ul className="panel-lista-valores">
                      {h.criterios_aceptacion.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
                {h.alcance_tecnico && <p><strong>Alcance técnico:</strong> {h.alcance_tecnico}</p>}
                {h.rol_sugerido && <p className="panel-historia-rol">Rol sugerido: {h.rol_sugerido}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PanelDetalle({ projectId, onBack, onViewBoard }) {
  const [proyecto, setProyecto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [analizando, setAnalizando] = useState(false)
  const [errorAnalisis, setErrorAnalisis] = useState(null)

  const [historias, setHistorias] = useState(null)
  const [generandoBacklog, setGenerandoBacklog] = useState(false)
  const [errorBacklog, setErrorBacklog] = useState(null)

  useEffect(() => {
    let cancelado = false

    const cargarProyecto = async () => {
      setLoading(true)
      setError(null)
      try {
        const project = await apiRequest(`/api/proyectos/${projectId}`)

        if (!cancelado) {
          setProyecto(project)
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message || 'Error de red al cargar la solicitud.')
        }
      } finally {
        if (!cancelado) {
          setLoading(false)
        }
      }
    }

    if (projectId) {
      cargarProyecto()
    }

    return () => {
      cancelado = true
    }
  }, [projectId])

  const handleAnalizar = async () => {
    setAnalizando(true)
    setErrorAnalisis(null)
    try {
      const analysis = await apiRequest(`/api/proyectos/${projectId}/analizar`, {
        method: 'POST',
      })

      setProyecto((prev) => ({ ...prev, estado: 'analizado', analisisIa: analysis }))
    } catch (err) {
      setErrorAnalisis(err.message || 'Error de red al analizar la solicitud.')
    } finally {
      setAnalizando(false)
    }
  }

  const handleGenerarBacklog = async () => {
    setGenerandoBacklog(true)
    setErrorBacklog(null)
    try {
      const stories = await apiRequest(`/api/proyectos/${projectId}/backlog`, {
        method: 'POST',
      })

      setHistorias(adaptarHistorias(stories, projectId))
      setProyecto((prev) => (prev ? { ...prev, estado: 'planificado' } : prev))
    } catch (err) {
      setErrorBacklog(err.message || 'Error de red al generar el backlog.')
    } finally {
      setGenerandoBacklog(false)
    }
  }

  // Si el proyecto ya está planificado (por ejemplo, entrando directo por refresh),
  // pedimos el backlog existente: el endpoint lo devuelve sin regenerar.
  useEffect(() => {
    if (proyecto && proyecto.estado === 'planificado' && !historias && !generandoBacklog) {
      handleGenerarBacklog()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyecto])

  return (
    <section className="panel-section">
      <div className="container">
        <button className="btn btn-outline panel-back-btn" onClick={onBack}>
          ← Volver
        </button>

        {loading && <p className="panel-state-msg">Cargando solicitud...</p>}

        {!loading && error && (
          <p className="panel-state-msg panel-state-error">Ocurrió un error: {error}</p>
        )}

        {!loading && !error && proyecto && (
          <>
            <div className="panel-header panel-detalle-header">
              <h2>{proyecto.payload?.empresa?.nombreEmpresa || `Solicitud #${proyecto.id}`}</h2>
              <StatusBadge estado={proyecto.estado} />
            </div>

            <div className="panel-detalle-grid">
              {Object.entries(proyecto.payload || {}).map(([seccion, datos]) => (
                <div className="card panel-payload-card" key={seccion}>
                  <SeccionPayload titulo={seccion} datos={datos} />
                </div>
              ))}
            </div>

            {proyecto.estado === 'nuevo' && (
              <div className="panel-accion-box">
                <button className="btn btn-primary" onClick={handleAnalizar} disabled={analizando}>
                  {analizando ? 'Analizando...' : 'Analizar con IA'}
                </button>
                {errorAnalisis && <p className="panel-state-msg panel-state-error">{errorAnalisis}</p>}
              </div>
            )}

            {(proyecto.estado === 'analizado' || proyecto.estado === 'planificado') && (
              <AnalisisIA analisis={proyecto.analisisIa} />
            )}

            {proyecto.estado === 'analizado' && (
              <div className="panel-accion-box">
                <button className="btn btn-primary" onClick={handleGenerarBacklog} disabled={generandoBacklog}>
                  {generandoBacklog ? 'Generando...' : 'Generar backlog'}
                </button>
                {errorBacklog && <p className="panel-state-msg panel-state-error">{errorBacklog}</p>}
              </div>
            )}

            {proyecto.estado === 'planificado' && generandoBacklog && (
              <p className="panel-state-msg">Cargando backlog...</p>
            )}

            {proyecto.estado === 'planificado' && errorBacklog && (
              <p className="panel-state-msg panel-state-error">{errorBacklog}</p>
            )}
            {historias && historias.length > 0 && (
              <div className="panel-accion-box">
                <button className="btn btn-primary" onClick={() => onViewBoard(projectId)}>
                  Ver tablero
                </button>
              </div>
            )}
            <Backlog historias={historias} />
          </>
        )}
      </div>
    </section>
  )
}

export default PanelDetalle
