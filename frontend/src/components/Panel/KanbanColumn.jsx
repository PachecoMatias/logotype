import KanbanCard from './KanbanCard.jsx'

function KanbanColumn({ nombre, historias, onMover, esPrimera, esUltima }) {
  return (
    <div className="kanban-columna">
      <div className="kanban-columna-header">
        <span className="kanban-columna-nombre">{nombre}</span>
        <span className="kanban-columna-contador">{historias.length}</span>
      </div>
      <div className="kanban-columna-body">
        {historias.length === 0 && (
          <p className="kanban-columna-vacia">Sin tarjetas</p>
        )}
        {historias.map((historia) => (
          <KanbanCard
            key={historia.id}
            historia={historia}
            columna={nombre}
            onMover={onMover}
            puedeAtras={!esPrimera}
            puedeAdelante={!esUltima}
          />
        ))}
      </div>
    </div>
  )
}

export default KanbanColumn