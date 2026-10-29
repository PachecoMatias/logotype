import { useState } from 'react'
import {
  budgetRanges,
  rubros,
  timelineRanges,
} from '../../data/projectOptions.js'
import {
  validateAdvisorFinalData,
} from './validation.js'

function FieldError({ children }) {
  return children ? <p className="adv-field-error">{children}</p> : null
}

function AdvisorFinalDetails({
  finalData,
  submitting,
  submitError,
  onFinalDataChange,
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
    const nextErrors = validateAdvisorFinalData(finalData)
    const hasErrors = Object.values(nextErrors).some(
      (section) => Object.keys(section).length
    )

    setErrors(nextErrors)
    if (!hasErrors) onSubmit()
  }

  return (
    <section className="adv-screen adv-final" aria-labelledby="adv-final-title">
      <header>
        <h1 id="adv-final-title" className="adv-enter-item" style={{ "--adv-enter-order": 0 }}>Últimos datos para enviar tu proyecto</h1>
        <p className="adv-enter-item" style={{ "--adv-enter-order": 1 }}>
          Pedimos únicamente la información que necesita el equipo para recibir
          y evaluar la solicitud.
        </p>
      </header>

      <form onSubmit={validate}>
        <section className="adv-final__section adv-enter-item" style={{ "--adv-enter-order": 2 }}>
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

        <section className="adv-final__section adv-enter-item" style={{ "--adv-enter-order": 3 }}>
          <h2>Presupuesto y plazos</h2>
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
          className="adv-button adv-button--primary adv-enter-item"
          style={{ "--adv-enter-order": 6 }}
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Enviando…' : 'Enviar proyecto'}
        </button>
      </form>
    </section>
  )
}

export default AdvisorFinalDetails
