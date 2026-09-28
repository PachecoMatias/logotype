function resumir(texto, maxLen = 90) {
  if (!texto) return ''
  return texto.length > maxLen ? `${texto.slice(0, maxLen)}…` : texto
}

function claseStatusPrioridad(prioridad) {
  if (prioridad === 'Alta') return 'status prioridad-alta'
  if (prioridad === 'Media') return 'status prioridad-media'
  return 'status prioridad-baja'
}

function KanbanCard({ historia, columna, onMover, onVerDetalle, puedeAtras, puedeAdelante }) {
  const completada = columna === 'Done'

  return (
    <article className={`kanban-card${completada ? ' kanban-card-completada' : ''}`}>
      <p className="kanban-card-texto">{resumir(historia.historia_usuario)}</p>

      <div className="kanban-card-badges">
        <span className={claseStatusPrioridad(historia.prioridad)}>
          {historia.prioridad}
        </span>
        <span className="status kanban-badge-estimacion">
          {historia.estimacion_fibonacci} pts
        </span>
        <span className="status kanban-badge-rol">{historia.rol_sugerido}</span>
        {completada && <span className="status kanban-badge-completada">✓ Completada</span>}
      </div>

      <p className="kanban-card-fase">{historia.fase}</p>
      {historia.fecha_inicio && historia.fecha_fin && (
        <p className="kanban-card-fechas">
          {historia.fecha_inicio} → {historia.fecha_fin}
        </p>
      )}
      <div className="kanban-card-acciones">
        <button
          className="btn btn-primary kanban-btn-detalle"
          type="button"
          onClick={(event) => onVerDetalle(historia, event.currentTarget)}
          aria-label={`Ver detalle de la historia: ${resumir(historia.historia_usuario, 55)}`}
        >
          Ver detalle
        </button>
        <button
          className="btn btn-outline kanban-btn-mover"
          onClick={() => onMover(historia.id, columna, -1)}
          disabled={!puedeAtras}
          aria-label={`Mover historia desde ${columna} a la columna anterior`}
        >
          ← Mover atrás
        </button>
        <button
          className="btn btn-outline kanban-btn-mover"
          onClick={() => onMover(historia.id, columna, 1)}
          disabled={!puedeAdelante}
          aria-label={`Mover historia desde ${columna} a la columna siguiente`}
        >
          Mover adelante →
        </button>
      </div>
    </article>
  )
}

export default KanbanCard
