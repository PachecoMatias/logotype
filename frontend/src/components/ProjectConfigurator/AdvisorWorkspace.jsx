import { useEffect, useRef, useState } from 'react'

const statusLabels = {
  entendida: 'Entendida',
  supuesta: 'Supuesta',
  editada_cliente: 'Editada por vos',
  sugerida_ia: 'Sugerida por la IA',
}

function Question({ question, value, onChange, inputRef }) {
  const choose = (answer) => onChange({ value: answer, noSabe: false })

  return (
    <fieldset className="adv-question adv-enter" ref={inputRef} tabIndex={-1}>
      <legend>{question.texto}</legend>

      {(question.tipo === 'opcion' || question.tipo === 'mixta') && (
        <div className="adv-question__options">
          {question.opciones.map((option) => (
            <label key={option}>
              <input
                type="radio"
                name={question.id}
                checked={!value.noSabe && value.value === option}
                onChange={() => choose(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}

      {(question.tipo === 'texto' || question.tipo === 'mixta') && (
        <label className="adv-field">
          <span>
            {question.tipo === 'mixta' ? 'Otra respuesta' : 'Tu respuesta'}
          </span>
          <textarea
            value={value.noSabe ? '' : value.value}
            maxLength={600}
            onChange={(event) => choose(event.target.value)}
          />
        </label>
      )}

      <button
        type="button"
        className={`adv-no-idea${value.noSabe ? ' is-selected' : ''}`}
        aria-pressed={value.noSabe}
        onClick={() => onChange({ value: '', noSabe: !value.noSabe })}
      >
        No sé
      </button>
    </fieldset>
  )
}

function Story({ story, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(story.texto)
  const label = story.aDetallar
    ? 'A detallar con el equipo'
    : statusLabels[story.estado]

  useEffect(() => setText(story.texto), [story.texto])

  const save = () => {
    if (!text.trim()) return
    onEdit(story.id, text)
    setEditing(false)
  }

  return (
    <article className="adv-story adv-story-enter">
      <div className="adv-story__meta">
        <span
          className={`adv-badge adv-badge--${story.aDetallar ? 'deferred' : story.estado}`}
        >
          {label}
        </span>
        <span>Etapa {story.etapa}</span>
      </div>

      {editing ? (
        <div className="adv-story__edit">
          <label htmlFor={`edit-${story.id}`}>Texto de la historia</label>
          <textarea
            id={`edit-${story.id}`}
            value={text}
            maxLength={400}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="adv-inline-actions">
            <button
              type="button"
              className="adv-button adv-button--small"
              onClick={save}
            >
              Guardar
            </button>
            <button
              type="button"
              className="adv-button adv-button--quiet"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p>{story.texto}</p>
      )}

      {!editing && (
        <div className="adv-story__actions">
          <button type="button" onClick={() => setEditing(true)}>
            Editar
          </button>
          <button type="button" onClick={() => onDelete(story.id)}>
            Eliminar
          </button>
        </div>
      )}
    </article>
  )
}

function AdvisorWorkspace({
  histories,
  round,
  loading,
  advisorError,
  relatedFeatures,
  onSubmitAnswers,
  onRetry,
  onFallback,
  onAcceptSuggestion,
  onRejectSuggestion,
  onEditStory,
  onDeleteStory,
  onAddStory,
  onAddFeature,
  onClose,
}) {
  const [drafts, setDrafts] = useState({})
  const [questionError, setQuestionError] = useState('')
  const [manualText, setManualText] = useState('')
  const [feature, setFeature] = useState('')
  const [otherFeature, setOtherFeature] = useState('')
  const [mobileTab, setMobileTab] = useState('questions')
  const firstQuestionRef = useRef(null)

  useEffect(() => {
    setDrafts({})
    setQuestionError('')
    if (round.preguntas.length)
      requestAnimationFrame(() => firstQuestionRef.current?.focus())
  }, [round.preguntas])

  const focusStory = histories.find(
    (story) => story.id === round.foco?.historiaId
  )
  const focusIndex = Math.max(
    0,
    histories.findIndex((story) => story.id === round.foco?.historiaId)
  )
  const detailedTotal = Math.min(round.progreso.total, round.progreso.tope)

  const submit = (event) => {
    event.preventDefault()
    const missing = round.preguntas.some((question) => {
      const draft = drafts[question.id]
      return !draft?.noSabe && !draft?.value?.trim()
    })

    if (missing) {
      setQuestionError('Respondé cada pregunta o elegí “No sé”.')
      return
    }

    onSubmitAnswers(
      round.preguntas.map((question) => ({
        preguntaId: question.id,
        historiaId: round.foco?.historiaId,
        aspecto: question.aspecto,
        pregunta: question.texto,
        respuesta: drafts[question.id]?.value?.trim() || '',
        noSabe: Boolean(drafts[question.id]?.noSabe),
        integrada: false,
      }))
    )
  }

  const addManual = () => {
    if (!manualText.trim()) return
    onAddStory(manualText)
    setManualText('')
  }

  const addFeature = () => {
    const value = feature === 'Otra' ? otherFeature.trim() : feature
    if (!value) return
    onAddFeature(value, feature === 'Otra')
    setFeature('')
    setOtherFeature('')
  }

  return (
    <section className="adv-screen" aria-labelledby="adv-work-title">
      <header className="adv-work-header">
        <div>
          <h1 id="adv-work-title">Démosle forma a tu proyecto</h1>
          <p>
            {focusStory
              ? `Sobre: ${focusStory.texto}`
              : 'Revisá tu idea antes de continuar.'}
          </p>
        </div>
        <div className="adv-progress" aria-label="Progreso del asesor">
          <strong>
            Funcionalidad {Math.min(focusIndex + 1, detailedTotal || 1)} de{' '}
            {detailedTotal || histories.length || 1}
          </strong>
          <span>
            {round.progreso.completas} de {round.progreso.total} completas
          </span>
        </div>
      </header>

      <div
        className="adv-mobile-tabs"
        role="tablist"
        aria-label="Vista del asesor"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'questions'}
          onClick={() => setMobileTab('questions')}
        >
          Preguntas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'stories'}
          onClick={() => setMobileTab('stories')}
        >
          Mi idea ({histories.length})
        </button>
      </div>

      <div className="adv-live" aria-live="polite">
        {round.preguntas.length
          ? `${round.preguntas.length} preguntas nuevas disponibles.`
          : 'No hay preguntas pendientes.'}
      </div>

      <div className="adv-split">
        <div
          className={`adv-questions${mobileTab !== 'questions' ? ' adv-mobile-hidden' : ''}`}
        >
          {loading ? (
            <div className="adv-thinking" role="status">
              <span aria-hidden="true" />
              <strong>La IA está pensando…</strong>
              <p>
                Está integrando tus respuestas y preparando la siguiente
                pregunta.
              </p>
            </div>
          ) : (
            <form onSubmit={submit}>
              {round.preguntas.map((question, index) => (
                <Question
                  key={question.id}
                  question={question}
                  value={drafts[question.id] || { value: '', noSabe: false }}
                  onChange={(value) =>
                    setDrafts((current) => ({
                      ...current,
                      [question.id]: value,
                    }))
                  }
                  inputRef={index === 0 ? firstQuestionRef : undefined}
                />
              ))}
              {questionError && (
                <p className="adv-field-error" role="alert">
                  {questionError}
                </p>
              )}
              <button className="adv-button adv-button--primary" type="submit">
                {round.preguntas.length
                  ? 'Enviar respuestas'
                  : 'Continuar con el asesor'}
              </button>
            </form>
          )}

          {advisorError && (
            <div className="adv-error" role="alert">
              <strong>No pudimos continuar con el asesor.</strong>
              <p>{advisorError.message}</p>
              <div className="adv-inline-actions">
                <button
                  type="button"
                  className="adv-button adv-button--line"
                  onClick={onRetry}
                >
                  Reintentar
                </button>
                {advisorError.canFallback && (
                  <button
                    type="button"
                    className="adv-button adv-button--quiet"
                    onClick={onFallback}
                  >
                    Continuar sin asesor
                  </button>
                )}
              </div>
            </div>
          )}

          {round.sugerencias.length > 0 && (
            <section
              className="adv-suggestions"
              aria-labelledby="adv-suggestions-title"
            >
              <h2 id="adv-suggestions-title">Sugerencias</h2>
              {round.sugerencias.map((suggestion) => (
                <div className="adv-suggestion" key={suggestion.id}>
                  <p>{suggestion.texto}</p>
                  <div className="adv-inline-actions">
                    <button
                      type="button"
                      onClick={() => onAcceptSuggestion(suggestion)}
                    >
                      Agregar a mi idea
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectSuggestion(suggestion)}
                    >
                      No, gracias
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          <button type="button" className="adv-finish-link" onClick={onClose}>
            Ya está, armá el resumen
          </button>
        </div>

        <aside
          className={`adv-stories${mobileTab !== 'stories' ? ' adv-mobile-hidden' : ''}`}
          aria-labelledby="adv-stories-title"
        >
          <h2 id="adv-stories-title">Tu idea, hasta ahora</h2>
          <div className="adv-story-list">
            {histories.map((story) => (
              <Story
                key={story.id}
                story={story}
                onEdit={onEditStory}
                onDelete={onDeleteStory}
              />
            ))}
          </div>

          <div className="adv-add-block">
            <label htmlFor="adv-new-story">Agregar historia</label>
            <textarea
              id="adv-new-story"
              value={manualText}
              maxLength={400}
              onChange={(event) => setManualText(event.target.value)}
              placeholder="Escribí la necesidad con tus palabras."
            />
            <button
              type="button"
              className="adv-button adv-button--line"
              onClick={addManual}
            >
              + Agregar historia
            </button>
          </div>

          <div className="adv-add-block">
            <label htmlFor="adv-related-feature">Agregar funcionalidad</label>
            <select
              id="adv-related-feature"
              value={feature}
              onChange={(event) => setFeature(event.target.value)}
            >
              <option value="">Seleccioná una opción</option>
              {relatedFeatures.map((item) => (
                <option key={item}>{item}</option>
              ))}
              <option>Otra</option>
            </select>
            {feature === 'Otra' && (
              <label className="adv-field" htmlFor="adv-custom-feature">
                <span>Nombre de la funcionalidad</span>
                <input
                  id="adv-custom-feature"
                  value={otherFeature}
                  onChange={(event) => setOtherFeature(event.target.value)}
                />
              </label>
            )}
            <button
              type="button"
              className="adv-button adv-button--line"
              onClick={addFeature}
            >
              Agregar funcionalidad
            </button>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default AdvisorWorkspace
