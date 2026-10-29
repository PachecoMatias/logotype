import { useEffect, useRef, useState } from 'react'

import {
  featuresList,
  platforms,
  projectTypes,
  userRanges,
  userTypes,
} from '../../data/projectOptions.js'
import { hasAdvisorStartDetailErrors } from '../../utils/validation.js'

function ToggleGroup({
  legend,
  options,
  selected,
  onToggle,
  groupRef,
  invalid = false,
  describedBy,
}) {
  return (
    <fieldset
      ref={groupRef}
      className="adv-option-group"
      tabIndex={invalid ? -1 : undefined}
      aria-invalid={invalid}
      aria-describedby={describedBy}
    >
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
  errors = {},
  advisorError,
  loading,
  onIdeaChange,
  onDataChange,
  onStart,
  onRetry,
  onFallback,
}) {
  const ideaRef = useRef(null)
  const processRef = useRef(null)
  const functionalityGroupRef = useRef(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    const hasDetailErrors = hasAdvisorStartDetailErrors(errors)
    if (hasDetailErrors && !detailsOpen) {
      setDetailsOpen(true)
      return
    }

    if (errors.idea) {
      ideaRef.current?.focus()
    } else if (errors.procesoActual) {
      processRef.current?.focus()
    } else if (errors.funcionalidades) {
      functionalityGroupRef.current?.focus()
    }
  }, [detailsOpen, errors])

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
        <h1 id="adv-start-title" className="adv-enter-item" style={{ "--adv-enter-order": 0 }}>Convertí tu idea en un proyecto claro</h1>
        <p className="adv-enter-item" style={{ "--adv-enter-order": 1 }}>
          Contanos qué querés resolver. El asesor va a ordenar tu idea en
          historias simples y preguntarte solo lo necesario, una funcionalidad
          por vez.
        </p>
      </div>

      <form className="adv-start__form" onSubmit={onStart}>
        <div className="adv-field adv-field--idea adv-enter-item" style={{ "--adv-enter-order": 2 }}>
          <label htmlFor="adv-idea">Contanos tu idea</label>
          <p id="adv-idea-help" className="adv-field__help">
            Contanos cómo trabajan hoy, qué problema querés resolver y qué
            resultado esperás.
          </p>
          <textarea
            ref={ideaRef}
            id="adv-idea"
            value={idea}
            maxLength={3000}
            onChange={(event) => onIdeaChange(event.target.value)}
            placeholder="Ej: Hoy registramos las ventas en planillas y necesitamos ordenar el stock para evitar errores."
            aria-describedby={
              errors.idea ? 'adv-idea-help adv-idea-error' : 'adv-idea-help'
            }
            aria-invalid={Boolean(errors.idea)}
          />
          <div className="adv-field__meta">
            {errors.idea ? (
              <span id="adv-idea-error" className="adv-field-error">
                {errors.idea}
              </span>
            ) : (
              <span>Podés escribir con tus propias palabras.</span>
            )}
            <span>{idea.length}/3000</span>
          </div>
        </div>

        <div className="adv-field adv-field--process adv-enter-item" style={{ "--adv-enter-order": 3 }}>
          <label htmlFor="adv-current-process">
            ¿Cómo realizan actualmente este proceso?
          </label>
          <p id="adv-current-process-help" className="adv-field__help">
            Si hoy no existe un proceso, contanos cómo lo resolvés actualmente,
            por ejemplo &apos;de forma manual&apos; o &apos;no lo hacemos&apos;.
          </p>
          <textarea
            ref={processRef}
            id="adv-current-process"
            value={data.procesoActual}
            minLength={10}
            maxLength={2000}
            onChange={(event) =>
              onDataChange({ ...data, procesoActual: event.target.value })
            }
            placeholder="Ej: Registramos cada pedido de forma manual en una planilla compartida."
            aria-describedby={
              errors.procesoActual
                ? 'adv-current-process-help adv-current-process-error'
                : 'adv-current-process-help'
            }
            aria-invalid={Boolean(errors.procesoActual)}
          />
          {errors.procesoActual && (
            <p id="adv-current-process-error" className="adv-field-error" role="alert">
              {errors.procesoActual}
            </p>
          )}
        </div>

        <div className="adv-project-details adv-enter-item" style={{ "--adv-enter-order": 4 }}>
          <button
            type="button"
            className="adv-project-details__toggle"
            aria-expanded={detailsOpen}
            aria-controls="adv-project-details"
            onClick={() => setDetailsOpen((current) => !current)}
          >
            <span>Agregar más detalles del proyecto</span>
            <span className="adv-project-details__chevron" aria-hidden="true" />
          </button>

          <div
            id="adv-project-details"
            className={`adv-project-details__panel${detailsOpen ? ' is-open' : ''}`}
            aria-hidden={!detailsOpen}
            inert={detailsOpen ? undefined : ''}
          >
            <div className="adv-project-details__content">
              <div className="adv-context">
                <p>
                  Estos datos preparan una primera ronda precisa y evitan volver a
                  pedirte la misma información al final.
                </p>

          <label className="adv-field adv-field--project-type" htmlFor="adv-project-type">
            Tipo de solución
            <select
              id="adv-project-type"
              value={data.tipoProyecto}
              onChange={(event) =>
                onDataChange({ ...data, tipoProyecto: event.target.value })
              }
              aria-invalid={Boolean(errors.tipoProyecto)}
            >
              <option value="">Seleccioná una opción</option>
              {projectTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
              <option value="no_estoy_seguro">No estoy seguro</option>
            </select>
            {errors.tipoProyecto && (
              <span className="adv-field-error">{errors.tipoProyecto}</span>
            )}
          </label>

          <ToggleGroup
            legend="Funcionalidades que ya imaginás"
            options={featuresList}
            selected={data.funcionalidades}
            onToggle={(value) => toggle('funcionalidades', value)}
            groupRef={functionalityGroupRef}
            invalid={Boolean(errors.funcionalidades)}
            describedBy={
              errors.funcionalidades ? 'adv-functionality-error' : undefined
            }
          />
          {errors.funcionalidades && (
            <p
              id="adv-functionality-error"
              className="adv-field-error adv-field-error--group"
              role="alert"
            >
              {errors.funcionalidades}
            </p>
          )}
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
              {errors.otraFuncionalidad && (
                <span className="adv-field-error">{errors.otraFuncionalidad}</span>
              )}
            </div>
          )}

          <ToggleGroup
            legend="Plataformas"
            options={platforms}
            selected={data.plataformas}
            onToggle={(value) => toggle('plataformas', value)}
            invalid={Boolean(errors.plataformas)}
          />
          {errors.plataformas && (
            <p className="adv-field-error">{errors.plataformas}</p>
          )}
          <ToggleGroup
            legend="Tipos de usuarios del sistema"
            options={userTypes}
            selected={data.tiposUsuario}
            onToggle={(value) => toggle('tiposUsuario', value)}
            invalid={Boolean(errors.tiposUsuario)}
          />
          {errors.tiposUsuario && (
            <p className="adv-field-error">{errors.tiposUsuario}</p>
          )}
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
              {errors.tiposUsuarioOtro && (
                <span className="adv-field-error">{errors.tiposUsuarioOtro}</span>
              )}
            </div>
          )}

          <div className="adv-field adv-field--user-count">
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
              <option value="">Seleccioná una opción</option>
              {userRanges.map((range) => (
                <option key={range}>{range}</option>
              ))}
            </select>
            {errors.cantidadUsuarios && (
              <span className="adv-field-error">{errors.cantidadUsuarios}</span>
            )}
              </div>
            </div>
          </div>
        </div>
        </div>

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
          className="adv-button adv-button--primary adv-enter-item"
          style={{ "--adv-enter-order": 4 }}
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
