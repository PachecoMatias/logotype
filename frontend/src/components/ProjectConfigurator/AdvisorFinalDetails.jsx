import { useState } from 'react'
import {
  budgetRanges,
  featuresList,
  improvementGoals,
  platforms,
  projectTypes,
  rubros,
  timelineRanges,
  userRanges,
  userTypes,
} from '../../data/projectOptions.js'
import {
  validateAlcance,
  validateEmpresa,
  validateFuncionalidades,
  validatePresupuesto,
  validateProblema,
  validateProyecto,
} from './validation.js'

function MultiChoice({ legend, options, values, onChange, error }) {
  const toggle = (option) => {
    onChange(
      values.includes(option)
        ? values.filter((value) => value !== option)
        : [...values, option]
    )
  }

  return (
    <fieldset className="adv-final__group">
      <legend>{legend}</legend>
      <div className="adv-chip-list">
        {options.map((option) => (
          <label className="adv-chip" key={option}>
            <input
              type="checkbox"
              checked={values.includes(option)}
              onChange={() => toggle(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {error && <p className="adv-field-error">{error}</p>}
    </fieldset>
  )
}

function FieldError({ children }) {
  return children ? <p className="adv-field-error">{children}</p> : null
}

function AdvisorFinalDetails({
  finalData,
  initialData,
  submitting,
  submitError,
  onFinalDataChange,
  onInitialDataChange,
  onSubmit,
}) {
  const [errors, setErrors] = useState({})

  const setSection = (section, field, value) => {
    onFinalDataChange({
      ...finalData,
      [section]: { ...finalData[section], [field]: value },
    })
  }

  const validate = (event) => {
    event.preventDefault()
    const functionalityData = {
      seleccionadas: initialData.funcionalidades,
      otra: initialData.otraFuncionalidad,
    }
    const scopeData = {
      plataformas: initialData.plataformas,
      cantidadUsuarios: initialData.cantidadUsuarios,
      necesitaTiposUsuario: initialData.tiposUsuario.length ? 'Sí' : 'No',
      tiposUsuario: initialData.tiposUsuario,
      tiposUsuarioOtro: initialData.tiposUsuarioOtro,
    }
    const nextErrors = {
      empresa: validateEmpresa(finalData.empresa),
      proyecto: validateProyecto(finalData.proyecto),
      problema: validateProblema({
        problemaActual: 'advisor',
        ...finalData.problema,
      }),
      funcionalidades: validateFuncionalidades(functionalityData),
      alcance: validateAlcance(scopeData),
      presupuesto: validatePresupuesto(finalData.presupuesto),
    }
    const hasErrors = Object.values(nextErrors).some(
      (section) => Object.keys(section).length
    )

    setErrors(nextErrors)
    if (!hasErrors) onSubmit()
  }

  return (
    <section className="adv-screen adv-final" aria-labelledby="adv-final-title">
      <header>
        <h1 id="adv-final-title">Últimos datos para enviar tu proyecto</h1>
        <p>
          Pedimos únicamente la información que necesita el equipo para recibir
          y evaluar la solicitud.
        </p>
      </header>

      <form onSubmit={validate}>
        <section className="adv-final__section">
          <h2>Empresa y contacto</h2>
          <div className="adv-final__grid">
            <label className="adv-field">
              Nombre de la empresa
              <input
                value={finalData.empresa.nombreEmpresa}
                onChange={(event) =>
                  setSection('empresa', 'nombreEmpresa', event.target.value)
                }
              />
              <FieldError>{errors.empresa?.nombreEmpresa}</FieldError>
            </label>
            <label className="adv-field">
              Persona de contacto
              <input
                value={finalData.empresa.contacto}
                onChange={(event) =>
                  setSection('empresa', 'contacto', event.target.value)
                }
              />
              <FieldError>{errors.empresa?.contacto}</FieldError>
            </label>
            <label className="adv-field">
              Email
              <input
                type="email"
                value={finalData.empresa.email}
                onChange={(event) =>
                  setSection('empresa', 'email', event.target.value)
                }
              />
              <FieldError>{errors.empresa?.email}</FieldError>
            </label>
            <label className="adv-field">
              Teléfono
              <input
                type="tel"
                value={finalData.empresa.telefono}
                onChange={(event) =>
                  setSection('empresa', 'telefono', event.target.value)
                }
              />
              <FieldError>{errors.empresa?.telefono}</FieldError>
            </label>
            <label className="adv-field">
              Rubro
              <select
                value={finalData.empresa.rubro}
                onChange={(event) =>
                  setSection('empresa', 'rubro', event.target.value)
                }
              >
                <option value="">Seleccioná una opción</option>
                {rubros.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <FieldError>{errors.empresa?.rubro}</FieldError>
            </label>
            {finalData.empresa.rubro === 'Otro' && (
              <label className="adv-field">
                Otro rubro
                <input
                  value={finalData.empresa.rubroOtro}
                  onChange={(event) =>
                    setSection('empresa', 'rubroOtro', event.target.value)
                  }
                />
                <FieldError>{errors.empresa?.rubroOtro}</FieldError>
              </label>
            )}
          </div>
        </section>

        <section className="adv-final__section">
          <h2>Contexto que exige la solicitud</h2>
          <p>
            Estos datos completan el formato que recibe el equipo y no se
            deducen con IA.
          </p>
          <label className="adv-field">
            Tipo de solución
            <select
              value={finalData.proyecto.tipoProyecto}
              onChange={(event) =>
                setSection('proyecto', 'tipoProyecto', event.target.value)
              }
            >
              <option value="">Seleccioná una opción</option>
              {projectTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <FieldError>{errors.proyecto?.tipoProyecto}</FieldError>
          </label>
          <label className="adv-field">
            ¿Cómo realizan este proceso actualmente?
            <textarea
              value={finalData.problema.procesoActual}
              onChange={(event) =>
                setSection('problema', 'procesoActual', event.target.value)
              }
            />
            <FieldError>{errors.problema?.procesoActual}</FieldError>
          </label>
          <MultiChoice
            legend="Objetivos principales"
            options={improvementGoals}
            values={finalData.problema.objetivos}
            onChange={(value) => setSection('problema', 'objetivos', value)}
            error={errors.problema?.objetivos}
          />
          {finalData.problema.objetivos.includes('Otro') && (
            <label className="adv-field">
              Otro objetivo
              <input
                value={finalData.problema.objetivosOtro}
                onChange={(event) =>
                  setSection('problema', 'objetivosOtro', event.target.value)
                }
              />
              <FieldError>{errors.problema?.objetivosOtro}</FieldError>
            </label>
          )}
        </section>

        <section className="adv-final__section">
          <h2>Alcance mínimo</h2>
          <p>
            Completá cualquier dato opcional que haya quedado pendiente al
            iniciar.
          </p>
          <MultiChoice
            legend="Funcionalidades"
            options={featuresList}
            values={initialData.funcionalidades}
            onChange={(value) =>
              onInitialDataChange({ ...initialData, funcionalidades: value })
            }
            error={errors.funcionalidades?.seleccionadas}
          />
          {initialData.funcionalidades.includes('Otra') && (
            <label className="adv-field">
              Otra funcionalidad
              <input
                value={initialData.otraFuncionalidad}
                onChange={(event) =>
                  onInitialDataChange({
                    ...initialData,
                    otraFuncionalidad: event.target.value,
                  })
                }
              />
              <FieldError>{errors.funcionalidades?.otra}</FieldError>
            </label>
          )}
          <MultiChoice
            legend="Plataformas"
            options={platforms}
            values={initialData.plataformas}
            onChange={(value) =>
              onInitialDataChange({ ...initialData, plataformas: value })
            }
            error={errors.alcance?.plataformas}
          />
          <label className="adv-field">
            Cantidad aproximada de usuarios
            <select
              value={initialData.cantidadUsuarios}
              onChange={(event) =>
                onInitialDataChange({
                  ...initialData,
                  cantidadUsuarios: event.target.value,
                })
              }
            >
              <option value="">Seleccioná una opción</option>
              {userRanges.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <FieldError>{errors.alcance?.cantidadUsuarios}</FieldError>
          </label>
          <MultiChoice
            legend="Tipos de usuarios (opcional)"
            options={userTypes}
            values={initialData.tiposUsuario}
            onChange={(value) =>
              onInitialDataChange({ ...initialData, tiposUsuario: value })
            }
            error={errors.alcance?.tiposUsuario}
          />
          {initialData.tiposUsuario.includes('Otro') && (
            <label className="adv-field">
              Otro tipo de usuario
              <input
                value={initialData.tiposUsuarioOtro}
                onChange={(event) =>
                  onInitialDataChange({
                    ...initialData,
                    tiposUsuarioOtro: event.target.value,
                  })
                }
              />
              <FieldError>{errors.alcance?.tiposUsuarioOtro}</FieldError>
            </label>
          )}
        </section>

        <section className="adv-final__section">
          <h2>Presupuesto y plazo</h2>
          <div className="adv-final__grid">
            <label className="adv-field">
              Presupuesto estimado
              <select
                value={finalData.presupuesto.presupuesto}
                onChange={(event) =>
                  setSection('presupuesto', 'presupuesto', event.target.value)
                }
              >
                <option value="">Seleccioná una opción</option>
                {budgetRanges.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <FieldError>{errors.presupuesto?.presupuesto}</FieldError>
            </label>
            <label className="adv-field">
              Plazo esperado
              <select
                value={finalData.presupuesto.plazo}
                onChange={(event) =>
                  setSection('presupuesto', 'plazo', event.target.value)
                }
              >
                <option value="">Seleccioná una opción</option>
                {timelineRanges.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <FieldError>{errors.presupuesto?.plazo}</FieldError>
            </label>
          </div>
          <label className="adv-field">
            Información adicional
            <textarea
              value={finalData.presupuesto.infoAdicional}
              onChange={(event) =>
                setSection('presupuesto', 'infoAdicional', event.target.value)
              }
            />
          </label>
        </section>

        {submitError && (
          <div className="adv-error" role="alert">
            <strong>No pudimos enviar el proyecto.</strong>
            <p>{submitError}</p>
          </div>
        )}
        <button
          className="adv-button adv-button--primary"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Enviando proyecto…' : 'Enviar solicitud'}
        </button>
      </form>
    </section>
  )
}

export default AdvisorFinalDetails
