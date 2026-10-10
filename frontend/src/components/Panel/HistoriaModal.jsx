import { useEffect, useRef, useState } from 'react'
import HistoriaEditor from './HistoriaEditor.jsx'

function clasePrioridad(prioridad) {
  if (prioridad === 'Alta') return 'adm-badge adm-badge--alta'
  if (prioridad === 'Baja') return 'adm-badge adm-badge--baja'
  return 'adm-badge adm-badge--media'
}

export function HistoriaContenido({ historia, numero }) {
  const titulo = historia.titulo || (numero ? `Historia ${numero}` : 'Historia de usuario')

  return (
    <div className="historia-contenido">
      <div className="adm-story__head">
        <h3 className="adm-story__title">{titulo}</h3>
        <div className="adm-story__badges">
          <span className={clasePrioridad(historia.prioridad)}>{historia.prioridad}</span>
          <span className="adm-badge adm-badge--points">{historia.estimacion_fibonacci} pts</span>
          <span className="adm-badge adm-badge--phase">{historia.fase}</span>
        </div>
      </div>

      <p className="adm-story__text">{historia.historia_usuario}</p>

      {historia.descripcion && <p className="adm-story__desc">{historia.descripcion}</p>}

      {historia.criterios_aceptacion?.length > 0 && (
        <div className="adm-story__group">
          <span className="adm-story__sub">Criterios de aceptación</span>
          <ul className="adm-story__criteria">
            {historia.criterios_aceptacion.map((criterio, index) => (
              <li key={index}>{criterio}</li>
            ))}
          </ul>
        </div>
      )}

      {historia.alcance_tecnico && (
        <div className="adm-story__group">
          <span className="adm-story__sub">Alcance técnico</span>
          <p className="adm-story__desc">{historia.alcance_tecnico}</p>
        </div>
      )}

      {historia.rol_sugerido && (
        <p className="adm-story__rol">
          <span className="adm-story__sub">Rol sugerido</span> {historia.rol_sugerido}
        </p>
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
      className="adm-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="adm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="historia-modal-title"
      >
        <div className="adm-modal__head">
          <h2 id="historia-modal-title" className="adm-modal__title">
            {editando ? 'Editar historia' : 'Detalle de historia'}
          </h2>
          <button
            ref={closeButtonRef}
            className="adm-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle de historia"
          >
            ×
          </button>
        </div>

        {editando ? (
          <div className="adm-modal__body">
            <HistoriaEditor
              historia={historia}
              onSaved={(actualizada) => {
                onHistoriaActualizada(actualizada)
                volverAlDetalle()
              }}
              onCancel={volverAlDetalle}
            />
          </div>
        ) : (
          <>
            <div className="adm-modal__body">
              <HistoriaContenido historia={historia} />
            </div>
            <div className="adm-modal__foot">
              <button
                ref={editButtonRef}
                className="adm-btn adm-btn--primary"
                type="button"
                onClick={() => setEditando(true)}
              >
                Editar historia
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default HistoriaModal
