function AdvisorConfirmation({ histories, onConfirm, onAdjust }) {
  return (
    <section
      className="adv-screen adv-confirm"
      aria-labelledby="adv-confirm-title"
    >
      <header>
        <h1 id="adv-confirm-title">Tu proyecto ya tiene una base clara</h1>
        <p>
          Revisá las historias antes de completar tus datos. Los supuestos
          quedan señalados para que el equipo los valide con vos.
        </p>
      </header>

      <div className="adv-confirm__list">
        {histories.map((story) => (
          <article
            className={story.estado === 'supuesta' ? 'is-assumption' : ''}
            key={story.id}
          >
            <div>
              <span>Etapa {story.etapa}</span>
              {(story.estado === 'supuesta' || story.aDetallar) && (
                <strong>
                  {story.aDetallar
                    ? 'A detallar con el equipo'
                    : 'Supuesto por validar'}
                </strong>
              )}
            </div>
            <p>{story.texto}</p>
          </article>
        ))}
      </div>

      <div className="adv-confirm__actions">
        <button
          type="button"
          className="adv-button adv-button--primary"
          onClick={onConfirm}
        >
          Está todo bien, enviar
        </button>
        <button
          type="button"
          className="adv-button adv-button--line"
          onClick={onAdjust}
        >
          Quiero ajustar algo
        </button>
      </div>
    </section>
  )
}

export default AdvisorConfirmation
