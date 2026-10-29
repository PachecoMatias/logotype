import { getStoryFunctionalityLabel } from '../../utils/advisorState.js'

const statusLabels = {
  a_completar: 'A completar',
  en_detalle: 'En detalle',
  entendida: 'Entendida',
  con_pendientes: 'Con pendientes',
  supuesta: 'Supuesta',
}

const originLabels = { cliente: 'Cliente', ia: 'IA' }

function AdvisorConfirmation({ histories, objectives = [], onConfirm, onAdjust }) {
  return (
    <section
      className="adv-screen adv-confirm"
      aria-labelledby="adv-confirm-title"
    >
      <header>
        <h1 id="adv-confirm-title" className="adv-enter-item" style={{ "--adv-enter-order": 0 }}>Tu proyecto ya tiene una base clara</h1>
        <p className="adv-enter-item" style={{ "--adv-enter-order": 1 }}>
          Revisá las historias antes de completar tus datos. Los supuestos
          quedan señalados para que el equipo los valide con vos.
        </p>
      </header>

      {objectives.length > 0 && (
        <section className="adv-confirm__objectives" aria-labelledby="adv-objectives-title">
          <h2 id="adv-objectives-title">Objetivos que entendimos</h2>
          <ul>
            {objectives.map(({ texto }) => (
              <li key={texto}>{texto}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="adv-confirm__list">
        {histories.map((story, index) => {
          const state = story.aDetallar
            ? 'A detallar con el equipo'
            : statusLabels[story.estado] || 'Pendiente de revisión'

          return (
            <article
              className={`${story.estado === 'supuesta' ? 'is-assumption' : ''} adv-enter-item`}
              style={{ "--adv-enter-order": index + 2 }}
              key={story.id}
            >
              <div className="adv-confirm__meta">
                <span>Etapa {story.etapa}</span>
                <span>Origen: {originLabels[story.origen] || 'Cliente'}</span>
                <strong
                  className={
                    story.estado === 'supuesta' || story.aDetallar
                      ? 'adv-confirm__state is-pending'
                      : 'adv-confirm__state'
                  }
                >
                  Estado: {state}
                </strong>
              </div>
              <div className="adv-confirm__story">
                <span className="adv-confirm__label">Funcionalidad / tema</span>
                <h2 className="adv-confirm__functionality">
                  {getStoryFunctionalityLabel(story)}
                </h2>
                <span className="adv-confirm__label">Descripción de la HU</span>
                <p>{story.texto}</p>
              </div>
            </article>
          )
        })}
      </div>

      <div className="adv-confirm__actions">
        <button
          type="button"
          className="adv-button adv-button--primary adv-enter-item"
          style={{ "--adv-enter-order": histories.length + 2 }}
          onClick={onConfirm}
        >
          Está todo bien, enviar
        </button>
        <button
          type="button"
          className="adv-button adv-button--line adv-enter-item"
          style={{ "--adv-enter-order": histories.length + 3 }}
          onClick={onAdjust}
        >
          Quiero ajustar algo
        </button>
      </div>
    </section>
  )
}

export default AdvisorConfirmation
