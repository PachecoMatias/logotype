import {
  featuresList,
  platforms,
  userRanges,
  userTypes,
} from '../../data/projectOptions.js'

function ToggleGroup({ legend, options, selected, onToggle }) {
  return (
    <fieldset className="adv-option-group">
      <legend>{legend}</legend>
      <div className="adv-chip-list">
        {options.map((option) => (
          <label className="adv-chip" key={option}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function AdvisorStart({
  idea,
  data,
  error,
  advisorError,
  loading,
  onIdeaChange,
  onDataChange,
  onStart,
  onRetry,
  onFallback,
}) {
  const toggle = (field, value) => {
    const current = data[field]
    onDataChange({
      ...data,
      [field]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    })
  }

  return (
    <section className="adv-screen adv-start" aria-labelledby="adv-start-title">
      <div className="adv-start__lead">
        <h1 id="adv-start-title">Convertí tu idea en un proyecto claro</h1>
        <p>
          Contanos qué querés resolver. El asesor va a ordenar tu idea en
          historias simples y preguntarte solo lo necesario, una funcionalidad
          por vez.
        </p>
      </div>

      <form className="adv-start__form" onSubmit={onStart}>
        <div className="adv-field adv-field--idea">
          <label htmlFor="adv-idea">Describí tu idea</label>
          <textarea
            id="adv-idea"
            value={idea}
            maxLength={3000}
            onChange={(event) => onIdeaChange(event.target.value)}
            placeholder="Ej: Necesito ordenar las ventas y el stock de mi ferretería."
            aria-describedby={error ? 'adv-idea-error' : undefined}
            aria-invalid={Boolean(error)}
          />
          <div className="adv-field__meta">
            {error ? (
              <span id="adv-idea-error" className="adv-field-error">
                {error}
              </span>
            ) : (
              <span>Solo este campo es obligatorio.</span>
            )}
            <span>{idea.length}/3000</span>
          </div>
        </div>

        <details className="adv-context">
          <summary>Ayudanos a entender mejor tu idea</summary>
          <p>
            Estos datos son opcionales y ayudan a que la primera ronda sea más
            precisa.
          </p>

          <ToggleGroup
            legend="Funcionalidades que ya imaginás"
            options={featuresList}
            selected={data.funcionalidades}
            onToggle={(value) => toggle('funcionalidades', value)}
          />
          {data.funcionalidades.includes('Otra') && (
            <div className="adv-field">
              <label htmlFor="adv-other-feature">Otra funcionalidad</label>
              <input
                id="adv-other-feature"
                value={data.otraFuncionalidad}
                onChange={(event) =>
                  onDataChange({
                    ...data,
                    otraFuncionalidad: event.target.value,
                  })
                }
              />
            </div>
          )}

          <ToggleGroup
            legend="Plataformas"
            options={platforms}
            selected={data.plataformas}
            onToggle={(value) => toggle('plataformas', value)}
          />
          <ToggleGroup
            legend="Tipos de usuarios del sistema"
            options={userTypes}
            selected={data.tiposUsuario}
            onToggle={(value) => toggle('tiposUsuario', value)}
          />
          {data.tiposUsuario.includes('Otro') && (
            <div className="adv-field">
              <label htmlFor="adv-other-user">Otro tipo de usuario</label>
              <input
                id="adv-other-user"
                value={data.tiposUsuarioOtro}
                onChange={(event) =>
                  onDataChange({
                    ...data,
                    tiposUsuarioOtro: event.target.value,
                  })
                }
              />
            </div>
          )}

          <div className="adv-field">
            <label htmlFor="adv-user-count">
              Cantidad aproximada de usuarios
            </label>
            <select
              id="adv-user-count"
              value={data.cantidadUsuarios}
              onChange={(event) =>
                onDataChange({ ...data, cantidadUsuarios: event.target.value })
              }
            >
              <option value="">Todavía no lo sé</option>
              {userRanges.map((range) => (
                <option key={range}>{range}</option>
              ))}
            </select>
          </div>
        </details>

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

        <button
          className="adv-button adv-button--primary"
          type="submit"
          disabled={loading}
        >
          {loading ? 'La IA está pensando…' : 'Empezar'}
        </button>
      </form>
    </section>
  )
}

export default AdvisorStart
