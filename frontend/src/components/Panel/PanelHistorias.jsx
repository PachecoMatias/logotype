import { HistoriaContenido } from './HistoriaModal.jsx'

function agruparPorFase(historias) {
  return historias.reduce((grupos, historia) => {
    const fase = historia.fase || 'Sin fase'
    if (!grupos[fase]) grupos[fase] = []
    grupos[fase].push(historia)
    return grupos
  }, {})
}

function PanelHistorias({ historias, onBack }) {
  const lista = Array.isArray(historias) ? historias : []
  const grupos = agruparPorFase(lista)
  let numeroHistoria = 0

  return (
    <section className="panel-section panel-historias-section">
      <div className="container">
        <button className="btn btn-outline panel-back-btn" onClick={onBack}>
          ← Volver
        </button>

        <div className="panel-header">
          <h2>Historias de usuario</h2>
          <p>Backlog real del proyecto, agrupado por fase.</p>
        </div>

        {lista.length === 0 ? (
          <div className="panel-empty-card">
            <p>No hay historias cargadas para este proyecto.</p>
            <button className="btn btn-primary" onClick={onBack}>
              Volver al detalle
            </button>
          </div>
        ) : (
          <div className="panel-backlog">
            {Object.entries(grupos).map(([fase, items]) => (
              <section key={fase} className="panel-backlog-fase">
                <h3>{fase}</h3>
                <div className="panel-backlog-grid">
                  {items.map((historia) => {
                    numeroHistoria += 1
                    return (
                      <article className="card panel-historia-card" key={historia.id}>
                        <HistoriaContenido historia={historia} numero={numeroHistoria} />
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default PanelHistorias
