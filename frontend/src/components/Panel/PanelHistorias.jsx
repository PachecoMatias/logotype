import { useState } from 'react'
import { HistoriaContenido } from './HistoriaModal.jsx'
import HistoriaEditor from './HistoriaEditor.jsx'
import '../../styles/panel.css'

function agruparPorFase(historias) {
  return historias.reduce((grupos, historia) => {
    const fase = historia.fase || 'Sin fase'
    if (!grupos[fase]) grupos[fase] = []
    grupos[fase].push(historia)
    return grupos
  }, {})
}

function PanelHistorias({ historias, onHistoriaActualizada, onBack }) {
  const [historiaEnEdicion, setHistoriaEnEdicion] = useState(null)
  const lista = Array.isArray(historias) ? historias : []
  const grupos = agruparPorFase(lista)
  let numeroHistoria = 0

  return (
    <section className="adm-section">
      <div className="adm-container">
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm adm-back" onClick={onBack}>
          ← Volver
        </button>

        <div className="adm-page-head">
          <span className="adm-eyebrow">Backlog</span>
          <h2 className="adm-page-title">Historias de usuario</h2>
          <p className="adm-page-sub">Backlog real del proyecto, agrupado por fase.</p>
        </div>

        {lista.length === 0 ? (
          <div className="adm-state adm-state--box">
            <div>
              <p className="adm-state__title">No hay historias cargadas</p>
              <p>Todavía no se generó el backlog de este proyecto.</p>
            </div>
            <button type="button" className="adm-btn adm-btn--primary" onClick={onBack}>
              Volver al detalle
            </button>
          </div>
        ) : (
          <div>
            {Object.entries(grupos).map(([fase, items]) => (
              <section key={fase} className="adm-phase">
                <div className="adm-phase__head">
                  <h3 className="adm-phase__name">{fase}</h3>
                  <span className="adm-phase__count">{items.length}</span>
                </div>
                <div className="adm-stories">
                  {items.map((historia) => {
                    numeroHistoria += 1
                    return (
                      <article className="adm-story" key={historia.id}>
                        {historiaEnEdicion === historia.id ? (
                          <HistoriaEditor
                            historia={historia}
                            onSaved={(actualizada) => {
                              onHistoriaActualizada(actualizada)
                              setHistoriaEnEdicion(null)
                            }}
                            onCancel={() => setHistoriaEnEdicion(null)}
                          />
                        ) : (
                          <>
                            <HistoriaContenido historia={historia} numero={numeroHistoria} />
                            <div className="adm-story__foot">
                              <button
                                type="button"
                                className="adm-btn adm-btn--ghost adm-btn--sm"
                                onClick={() => setHistoriaEnEdicion(historia.id)}
                              >
                                Editar historia
                              </button>
                            </div>
                          </>
                        )}
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
