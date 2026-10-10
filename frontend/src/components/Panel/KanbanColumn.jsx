import KanbanCard from './KanbanCard.jsx'

function slugColumna(nombre) {
  return nombre.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-+|-+$/g, '')
}

function KanbanColumn({ nombre, historias, onMover, onVerDetalle, esPrimera, esUltima }) {
  const slug = slugColumna(nombre)

  return (
    <div className={`adm-col adm-col--${slug}`}>
      <div className="adm-col__head">
        <span className="adm-col__name">{nombre}</span>
        <span className="adm-col__count">{historias.length}</span>
      </div>
      <div className="adm-col__body">
        {historias.length === 0 && (
          <p className="adm-col__empty">Sin tarjetas</p>
        )}
        {historias.map((historia) => (
          <KanbanCard
            key={historia.id}
            historia={historia}
            columna={nombre}
            onMover={onMover}
            onVerDetalle={onVerDetalle}
            puedeAtras={!esPrimera}
            puedeAdelante={!esUltima}
          />
        ))}
      </div>
    </div>
  )
}

export default KanbanColumn
