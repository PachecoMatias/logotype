import { useEffect, useState } from 'react'
import KanbanColumn from './KanbanColumn.jsx'
import { apiRequest } from '../../utils/api.js'
import { prepararHistoriasTablero } from '../../utils/backlog.js'

const COLUMNAS = ['Backlog', 'To Do', 'In Progress', 'In Code Review', 'In QA', 'Done']
function fechaHoyString() {
  const hoy = new Date()
  const yyyy = hoy.getFullYear()
  const mm = String(hoy.getMonth() + 1).padStart(2, '0')
  const dd = String(hoy.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function PanelTablero({ projectId, onBack }) {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [historiasPorColumna, setHistoriasPorColumna] = useState(() =>
    COLUMNAS.reduce((acc, col) => ({ ...acc, [col]: [] }), {})
  )

  useEffect(() => {
    let cancelado = false

    async function cargarBacklog() {
      setCargando(true)
      setError(null)
      try {
        const stories = await apiRequest(`/api/proyectos/${projectId}/backlog`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        if (cancelado) return

        const historias = prepararHistoriasTablero(
          stories,
          projectId,
          fechaHoyString(),
        )
        setHistoriasPorColumna({
          Backlog: historias,
          'To Do': [],
          'In Progress': [],
          'In Code Review': [],
          'In QA': [],
          Done: [],
        })
      } catch (err) {
        if (!cancelado) setError(err.message)
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargarBacklog()

    return () => {
      cancelado = true
    }
  }, [projectId])

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

  if (cargando) {
    return (
      <div className="tablero-standalone">
        <div className="container">
          <p className="tablero-mensaje">Cargando tablero...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="tablero-standalone">
        <div className="container tablero-error-box">
          <p className="tablero-mensaje">
            No se pudo cargar el tablero: {error || 'respuesta inesperada del servidor.'}
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
              esPrimera={col === COLUMNAS[0]}
              esUltima={col === COLUMNAS[COLUMNAS.length - 1]}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default PanelTablero
