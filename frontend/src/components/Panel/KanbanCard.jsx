function resumir(texto, maxLen = 90) {
  if (!texto) return ''
  return texto.length > maxLen ? `${texto.slice(0, maxLen)}…` : texto
}

function clasePrioridad(prioridad) {
  if (prioridad === 'Alta') return 'adm-badge adm-badge--alta'
  if (prioridad === 'Media') return 'adm-badge adm-badge--media'
  return 'adm-badge adm-badge--baja'
}

function KanbanCard({ historia, columna, onMover, onVerDetalle, puedeAtras, puedeAdelante }) {
  const completada = columna === 'Done'

  return (
    <article className={`adm-card${completada ? ' adm-card--done' : ''}`}>
      <p className="adm-card__text">{resumir(historia.historia_usuario)}</p>

      <div className="adm-card__badges">
        <span className={clasePrioridad(historia.prioridad)}>
          {historia.prioridad}
        </span>
        <span className="adm-badge adm-badge--points">
          {historia.estimacion_fibonacci} pts
        </span>
        <span className="adm-badge adm-badge--role">{historia.rol_sugerido}</span>
        {completada && <span className="adm-badge adm-badge--done">✓ Completada</span>}
      </div>

      <p className="adm-card__meta">{historia.fase}</p>
      {historia.fecha_inicio && historia.fecha_fin && (
        <p className="adm-card__dates">
          {historia.fecha_inicio} → {historia.fecha_fin}
        </p>
      )}
      <div className="adm-card__actions">
        <button
          className="adm-btn adm-btn--primary adm-btn--detail"
          type="button"
          onClick={(event) => onVerDetalle(historia, event.currentTarget)}
          aria-label={`Ver detalle de la historia: ${resumir(historia.historia_usuario, 55)}`}
        >
          Ver detalle
        </button>
        <button
          className="adm-btn adm-btn--ghost adm-btn--move"
          type="button"
          onClick={() => onMover(historia.id, columna, -1)}
          disabled={!puedeAtras}
          aria-label={`Mover historia desde ${columna} a la columna anterior`}
        >
          ← Anterior
        </button>
        <button
          className="adm-btn adm-btn--ghost adm-btn--move"
          type="button"
          onClick={() => onMover(historia.id, columna, 1)}
          disabled={!puedeAdelante}
          aria-label={`Mover historia desde ${columna} a la columna siguiente`}
        >
          Siguiente →
        </button>
      </div>
    </article>
  )
}

export default KanbanCard
