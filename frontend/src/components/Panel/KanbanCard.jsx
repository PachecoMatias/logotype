function resumir(texto, maxLen = 90) {
  if (!texto) return ''
  return texto.length > maxLen ? `${texto.slice(0, maxLen)}…` : texto
}

function claseStatusPrioridad(prioridad) {
  if (prioridad === 'Alta') return 'status prioridad-alta'
  if (prioridad === 'Media') return 'status prioridad-media'
  return 'status prioridad-baja'
}

function KanbanCard({ historia, columna, onMover, puedeAtras, puedeAdelante }) {
  return (
    <div className="kanban-card">
      <p className="kanban-card-texto">{resumir(historia.historia_usuario)}</p>

      <div className="kanban-card-badges">
        <span className={claseStatusPrioridad(historia.prioridad)}>
          {historia.prioridad}
        </span>
        <span className="status kanban-badge-estimacion">
          {historia.estimacion_fibonacci} pts
        </span>
        <span className="status kanban-badge-rol">{historia.rol_sugerido}</span>
      </div>

      <p className="kanban-card-fase">{historia.fase}</p>
      {historia.fecha_inicio && historia.fecha_fin && (
        <p className="kanban-card-fechas">
          {historia.fecha_inicio} → {historia.fecha_fin}
        </p>
      )}
      <div className="kanban-card-acciones">
        <button
          className="btn btn-outline kanban-btn-mover"
          onClick={() => onMover(historia.id, columna, -1)}
          disabled={!puedeAtras}
        >
          ← Mover atrás
        </button>
        <button
          className="btn btn-outline kanban-btn-mover"
          onClick={() => onMover(historia.id, columna, 1)}
          disabled={!puedeAdelante}
        >
          Mover adelante →
        </button>
      </div>
    </div>
  )
}

export default KanbanCard