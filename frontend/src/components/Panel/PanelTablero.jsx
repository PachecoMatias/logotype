import { useCallback, useState } from 'react'
import KanbanColumn from './KanbanColumn.jsx'
import HistoriaModal from './HistoriaModal.jsx'
import { prepararHistoriasTablero } from '../../utils/backlog.js'

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
      <div className="tablero-standalone">
        <div className="container tablero-error-box">
          <p className="tablero-mensaje">
            No hay historias cargadas para mostrar en el tablero.
          </p>
          <button className="btn btn-primary" onClick={onBack}>
            ← Volver al detalle
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="tablero-standalone">
      <header className="tablero-topbar">
        <div className="container tablero-topbar-inner">
          <button className="btn btn-outline" onClick={onBack}>
            ← Volver
          </button>
          <h2 className="tablero-titulo">Tablero del proyecto</h2>
        </div>
      </header>

      <div className="tablero-scroll-wrapper">
        <div className="tablero-columnas">
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
      {detalleAbierto && (
        <HistoriaModal
          historia={detalleAbierto.historia}
          onHistoriaActualizada={actualizarHistoria}
          onClose={cerrarDetalle}
        />
      )}
    </div>
  )
}

export default PanelTablero
