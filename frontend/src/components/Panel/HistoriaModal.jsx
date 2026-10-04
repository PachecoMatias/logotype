import { useEffect, useRef, useState } from 'react'
import HistoriaEditor from './HistoriaEditor.jsx'

export function HistoriaContenido({ historia, numero }) {
  const titulo = historia.titulo || (numero ? `Historia ${numero}` : 'Historia de usuario')

  return (
    <div className="historia-contenido">
      <h3>{titulo}</h3>
      <div className="panel-historia-top">
        <span className="panel-chip">{historia.prioridad}</span>
        <span className="panel-chip panel-chip-fib">
          {historia.estimacion_fibonacci} puntos Fibonacci
        </span>
        <span className="panel-chip panel-chip-fase">{historia.fase}</span>
      </div>
      <p className="panel-historia-texto">{historia.historia_usuario}</p>
      {historia.descripcion && <p className="panel-historia-desc">{historia.descripcion}</p>}
      {historia.criterios_aceptacion?.length > 0 && (
        <div>
          <strong>Criterios de aceptación</strong>
          <ul className="panel-lista-valores">
            {historia.criterios_aceptacion.map((criterio, index) => (
              <li key={index}>{criterio}</li>
            ))}
          </ul>
        </div>
      )}
      {historia.alcance_tecnico && (
        <p><strong>Alcance técnico:</strong> {historia.alcance_tecnico}</p>
      )}
      {historia.rol_sugerido && (
        <p className="panel-historia-rol"><strong>Rol sugerido:</strong> {historia.rol_sugerido}</p>
      )}
    </div>
  )
}

function HistoriaModal({ historia, onHistoriaActualizada, onClose }) {
  const [editando, setEditando] = useState(false)
  const closeButtonRef = useRef(null)
  const editButtonRef = useRef(null)

  useEffect(() => {
    closeButtonRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const volverAlDetalle = () => {
    setEditando(false)
    window.requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  return (
    <div
      className="historia-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="historia-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="historia-modal-title"
      >
        <div className="historia-modal-header">
          <h2 id="historia-modal-title">
            {editando ? 'Editar historia' : 'Detalle de historia'}
          </h2>
          <button
            ref={closeButtonRef}
            className="historia-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle de historia"
          >
            ×
          </button>
        </div>
        {editando ? (
          <HistoriaEditor
            historia={historia}
            onSaved={(actualizada) => {
              onHistoriaActualizada(actualizada)
              volverAlDetalle()
            }}
            onCancel={volverAlDetalle}
          />
        ) : (
          <>
            <HistoriaContenido historia={historia} />
            <button
              ref={editButtonRef}
              className="btn btn-primary historia-modal-edit"
              type="button"
              onClick={() => setEditando(true)}
            >
              Editar historia
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default HistoriaModal
