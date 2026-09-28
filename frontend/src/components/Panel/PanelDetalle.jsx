import { useCallback, useEffect, useRef, useState } from 'react'
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

function PanelDetalle({
  projectId,
  historias,
  onBack,
  onBacklogLoaded,
  onViewBoard,
  onViewStories,
}) {
  const [proyecto, setProyecto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [analizando, setAnalizando] = useState(false)
  const [errorAnalisis, setErrorAnalisis] = useState(null)

  const [generandoBacklog, setGenerandoBacklog] = useState(false)
  const [errorBacklog, setErrorBacklog] = useState(null)
  const cargaPlanificadaIntentada = useRef(null)

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

  const handleGenerarBacklog = useCallback(async () => {
    setGenerandoBacklog(true)
    setErrorBacklog(null)
    try {
      const stories = await apiRequest(`/api/proyectos/${projectId}/backlog`, {
        method: 'POST',
      })

      onBacklogLoaded(projectId, adaptarHistorias(stories, projectId))
      setProyecto((prev) => (prev ? { ...prev, estado: 'planificado' } : prev))
    } catch (err) {
      setErrorBacklog(err.message || 'Error de red al generar el backlog.')
    } finally {
      setGenerandoBacklog(false)
    }
  }, [onBacklogLoaded, projectId])

  // Si el proyecto ya está planificado (por ejemplo, entrando directo por refresh),
  // pedimos el backlog existente: el endpoint lo devuelve sin regenerar.
  useEffect(() => {
    if (
      proyecto?.estado === 'planificado'
      && historias === undefined
      && cargaPlanificadaIntentada.current !== projectId
    ) {
      cargaPlanificadaIntentada.current = projectId
      handleGenerarBacklog()
    }
  }, [handleGenerarBacklog, historias, projectId, proyecto?.estado])

  const tieneBacklog = Array.isArray(historias) && historias.length > 0

  return (
    <section className="panel-section">
      <div className="container">
        <button className="btn btn-outline panel-back-btn" onClick={onBack}>
          ← Volver
        </button>

        {loading && <p className="panel-state-msg panel-state-msg-on-dark">Cargando solicitud...</p>}

        {!loading && error && (
          <p className="panel-state-msg panel-state-error panel-state-msg-on-dark">Ocurrió un error: {error}</p>
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

            {proyecto.estado === 'analizado' && !tieneBacklog && (
              <div className="panel-accion-box">
                <button className="btn btn-primary" onClick={handleGenerarBacklog} disabled={generandoBacklog}>
                  {generandoBacklog ? 'Generando...' : 'Generar backlog'}
                </button>
                {errorBacklog && <p className="panel-state-msg panel-state-error">{errorBacklog}</p>}
              </div>
            )}

            {proyecto.estado === 'planificado' && !tieneBacklog && generandoBacklog && (
              <p className="panel-state-msg">Cargando backlog...</p>
            )}

            {proyecto.estado === 'planificado' && !tieneBacklog && errorBacklog && (
              <p className="panel-state-msg panel-state-error">{errorBacklog}</p>
            )}
            {tieneBacklog && (
              <div className="panel-accion-box panel-action-group">
                <button className="btn btn-primary" onClick={() => onViewBoard(projectId)}>
                  Ver tablero
                </button>
                <button className="btn btn-outline" onClick={() => onViewStories(projectId)}>
                  Ver historias de usuario
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default PanelDetalle
