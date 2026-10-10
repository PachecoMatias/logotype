import { useCallback, useState } from 'react'
import KanbanColumn from './KanbanColumn.jsx'
import HistoriaModal from './HistoriaModal.jsx'
import { prepararHistoriasTablero } from '../../utils/backlog.js'
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
  return {
    Backlog: preparadas,
    'To Do': [],
    'In Progress': [],
    'In Code Review': [],
    'In QA': [],
    Done: [],
  }
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

  const moverTarjeta = (historiaId, columnaActual, direccion) => {
    const indiceActual = COLUMNAS.indexOf(columnaActual)
    const indiceDestino = indiceActual + direccion
    if (indiceDestino < 0 || indiceDestino >= COLUMNAS.length) return

    const columnaDestino = COLUMNAS[indiceDestino]

    setHistoriasPorColumna((prev) => {
      const historia = prev[columnaActual].find((h) => h.id === historiaId)
      if (!historia) return prev

      return {
        ...prev,
        [columnaActual]: prev[columnaActual].filter((h) => h.id !== historiaId),
        [columnaDestino]: [...prev[columnaDestino], historia],
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
      <section className="adm-section">
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
      <header className="adm-topbar">
        <div className="adm-topbar__inner adm-topbar__inner--board">
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={onBack}>
            ← Volver
          </button>
          <span className="adm-topbar__crumb">Tablero del proyecto</span>
        </div>
      </header>

      <div className="adm-board">
        <div className="adm-board__scroll">
          <div className="adm-board__cols">
            {COLUMNAS.map((col) => (
              <KanbanColumn
                key={col}
                nombre={col}
                historias={historiasPorColumna[col]}
                onMover={moverTarjeta}
                onVerDetalle={(historia, trigger) => setDetalleAbierto({ historia, trigger })}
                esPrimera={col === COLUMNAS[0]}
                esUltima={col === COLUMNAS[COLUMNAS.length - 1]}
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
