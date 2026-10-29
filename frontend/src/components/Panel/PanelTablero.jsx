import { useCallback, useRef, useState } from 'react'
import KanbanColumn from './KanbanColumn.jsx'
import HistoriaModal from './HistoriaModal.jsx'
import { prepararHistoriasTablero } from '../../utils/backlog.js'
import { actualizarColumnaHistoria } from '../../utils/api.js'
import '../../styles/panel.css'

const COLUMNAS = ['Backlog', 'To Do', 'In Progress', 'In Code Review', 'In QA', 'Done']
function fechaHoyString() {
  const hoy = new Date()
  const yyyy = hoy.getFullYear()
  const mm = String(hoy.getMonth() + 1).padStart(2, '0')
  const dd = String(hoy.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function crearColumnas(historias) {
  const preparadas = prepararHistoriasTablero(historias, fechaHoyString())
  const columnas = {
    Backlog: [],
    'To Do': [],
    'In Progress': [],
    'In Code Review': [],
    'In QA': [],
    Done: [],
  }

  preparadas.forEach((historia) => {
    const columna = COLUMNAS.includes(historia.columnaTablero)
      ? historia.columnaTablero
      : 'Backlog'
    columnas[columna].push({ ...historia, columnaTablero: columna })
  })

  return columnas
}

function reemplazarHistoria(actual, actualizada) {
  return actual.id === actualizada.id
    ? { ...actual, ...actualizada, fase: actual.fase }
    : actual
}

function PanelTablero({ historias, onHistoriaActualizada, onBack }) {
  const [historiasPorColumna, setHistoriasPorColumna] = useState(() =>
    crearColumnas(Array.isArray(historias) ? historias : [])
  )
  const [detalleAbierto, setDetalleAbierto] = useState(null)
  const [errorMovimiento, setErrorMovimiento] = useState('')
  const colasPorHistoria = useRef(new Map())
  const versionesPorHistoria = useRef(new Map())

  const moverTarjeta = (historiaId, columnaActual, direccion) => {
    const indiceActual = COLUMNAS.indexOf(columnaActual)
    const indiceDestino = indiceActual + direccion
    if (indiceDestino < 0 || indiceDestino >= COLUMNAS.length) return

    const columnaDestino = COLUMNAS[indiceDestino]
    const historia = historiasPorColumna[columnaActual].find((item) => item.id === historiaId)
    if (!historia) return
    const historiaMovida = { ...historia, columnaTablero: columnaDestino }
    setErrorMovimiento('')

    setHistoriasPorColumna((prev) => {
      const historiaActual = prev[columnaActual].find((item) => item.id === historiaId)
      if (!historiaActual) return prev

      return {
        ...prev,
        [columnaActual]: prev[columnaActual].filter((item) => item.id !== historiaId),
        [columnaDestino]: [...prev[columnaDestino], historiaMovida],
      }
    })

    onHistoriaActualizada(historiaMovida)

    const version = (versionesPorHistoria.current.get(historiaId) ?? 0) + 1
    versionesPorHistoria.current.set(historiaId, version)
    const solicitudAnterior = colasPorHistoria.current.get(historiaId) ?? Promise.resolve()
    const solicitud = solicitudAnterior
      .catch(() => undefined)
      .then(() => actualizarColumnaHistoria(historiaId, columnaDestino))

    colasPorHistoria.current.set(historiaId, solicitud)
    solicitud
      .then((actualizada) => {
        if (versionesPorHistoria.current.get(historiaId) === version) {
          actualizarHistoria(actualizada)
          setErrorMovimiento('')
        }
      })
      .catch(() => {
        if (versionesPorHistoria.current.get(historiaId) !== version) return

        const historiaRestaurada = { ...historia, columnaTablero: columnaActual }
        setHistoriasPorColumna((prev) => {
          const sigueEnDestino = prev[columnaDestino].some(
            (item) => item.id === historiaId && item.columnaTablero === columnaDestino
          )
          if (!sigueEnDestino) return prev

          return {
            ...prev,
            [columnaDestino]: prev[columnaDestino].filter((item) => item.id !== historiaId),
            [columnaActual]: [...prev[columnaActual], historiaRestaurada],
          }
        })
        onHistoriaActualizada(historiaRestaurada, columnaDestino)
        setErrorMovimiento('No se pudo actualizar la columna. Inténtalo de nuevo.')
      })
      .finally(() => {
        if (colasPorHistoria.current.get(historiaId) === solicitud) {
          colasPorHistoria.current.delete(historiaId)
        }
      })
  }

  const cerrarDetalle = useCallback(() => {
    const trigger = detalleAbierto?.trigger
    setDetalleAbierto(null)
    window.requestAnimationFrame(() => trigger?.focus())
  }, [detalleAbierto])

  const actualizarHistoria = useCallback((actualizada) => {
    setHistoriasPorColumna((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([columna, historiasColumna]) => [
          columna,
          historiasColumna.map((historia) => reemplazarHistoria(historia, actualizada)),
        ])
      )
    )
    setDetalleAbierto((prev) =>
      prev
        ? { ...prev, historia: reemplazarHistoria(prev.historia, actualizada) }
        : prev
    )
    onHistoriaActualizada(actualizada)
  }, [onHistoriaActualizada])

  if (!Array.isArray(historias) || historias.length === 0) {
    return (
      <section className="adm-section adm-enter-item" style={{ '--adm-enter-order': 0 }}>
        <div className="adm-container">
          <div className="adm-state adm-state--box">
            <div>
              <p className="adm-state__title">Sin historias para el tablero</p>
              <p>No hay historias cargadas para mostrar en el tablero.</p>
            </div>
            <button type="button" className="adm-btn adm-btn--primary" onClick={onBack}>
              ← Volver al detalle
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <header
        className="adm-topbar adm-enter-item"
        style={{ '--adm-enter-order': 0 }}
      >
        <div className="adm-topbar__inner adm-topbar__inner--board">
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={onBack}>
            ← Volver
          </button>
          <div className="adm-board-heading">
            <span className="adm-eyebrow">Flujo de trabajo</span>
            <div>
              <h1>Tablero del proyecto</h1>
              <p>Historias organizadas por estado de avance.</p>
            </div>
          </div>
        </div>
      </header>

      {errorMovimiento && (
        <div className="adm-alert adm-alert--error" role="alert">
          {errorMovimiento}
        </div>
      )}

      <div className="adm-board">
        <div className="adm-board__scroll">
          <div className="adm-board__cols">
            {COLUMNAS.map((col, index) => (
              <KanbanColumn
                key={col}
                nombre={col}
                historias={historiasPorColumna[col]}
                onMover={moverTarjeta}
                onVerDetalle={(historia, trigger) => setDetalleAbierto({ historia, trigger })}
                esPrimera={col === COLUMNAS[0]}
                esUltima={col === COLUMNAS[COLUMNAS.length - 1]}
                enterOrder={index + 1}
              />
            ))}
          </div>
        </div>
      </div>

      {detalleAbierto && (
        <HistoriaModal
          historia={detalleAbierto.historia}
          onHistoriaActualizada={actualizarHistoria}
          onClose={cerrarDetalle}
        />
      )}
    </>
  )
}

export default PanelTablero
