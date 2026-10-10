import { useState, useRef, useEffect } from 'react'
import ProgressBar from './ProgressBar.jsx'
import StepCompany from './StepCompany.jsx'
import StepProject from './StepProject.jsx'
import StepProblem from './StepProblem.jsx'
import StepFeatures from './StepFeatures.jsx'
import StepScope from './StepScope.jsx'
import { Stagger } from '../../motion/Reveal.jsx'
import StepBudget from './StepBudget.jsx'
import ProjectSummary from './ProjectSummary.jsx'
import SuccessMessage from './SuccessMessage.jsx'
import { configuratorSteps, initialProjectData } from '../../data/projectOptions.js'
import {
  validateEmpresa,
  validateProyecto,
  validateProblema,
  validateFuncionalidades,
  validateAlcance,
  validatePresupuesto,
} from './validation.js'
import { apiRequest } from '../../utils/api.js'

const stepKeys = ['empresa', 'proyecto', 'problema', 'funcionalidades', 'alcance', 'presupuesto']
const validators = [
  validateEmpresa,
  validateProyecto,
  validateProblema,
  validateFuncionalidades,
  validateAlcance,
  validatePresupuesto,
]

function ProjectConfigurator({ onBack }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [projectData, setProjectData] = useState(initialProjectData)
  const [errors, setErrors] = useState({})
  const [direction, setDirection] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const workspaceRef = useRef(null)
  const isFirstRender = useRef(true)
  const isSummaryStep = stepIndex === configuratorSteps.length - 1

  const goToStep = (index, dir) => {
    setDirection(dir)
    setStepIndex(index)
    setErrors({})
  }

  const handleStepDataChange = (key, value) => {
    setProjectData((prev) => ({ ...prev, [key]: value }))
  }
// Cada vez que cambia el stepIndex, scrolleamos hacia arriba (excepto la primera vez)
  useEffect(() => {
    // Si es la primera vez que carga, cambiamos la bandera a falso y cortamos la ejecución
    if (isFirstRender.current) {
      isFirstRender.current = false
      return 
    }

    // Si NO es la primera vez, hacemos el scroll normal
    if (workspaceRef.current) {
      const offsetTop = workspaceRef.current.getBoundingClientRect().top + window.scrollY - 100
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      })
    }
  }, [stepIndex])
  const handleNext = () => {
    if (isSummaryStep) {
      handleSubmit()
      return
    }

    const key = stepKeys[stepIndex]
    const validate = validators[stepIndex]
    const stepErrors = validate(projectData[key])

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }

    goToStep(stepIndex + 1, 1)
  }

  const handleBack = () => {
    if (stepIndex === 0) return
    goToStep(stepIndex - 1, -1)
  }

  const handleEditStep = (index) => {
    goToStep(index, -1)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)

    try {
      await apiRequest('/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      }, 201)
      setSubmitted(true)
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRestart = () => {
    setProjectData(initialProjectData)
    setStepIndex(0)
    setErrors({})
    setSubmitted(false)
    setSubmitError(null)
  }

  const renderStep = () => {
    switch (stepKeys[stepIndex]) {
      case 'empresa': return <StepCompany data={projectData.empresa} errors={errors} onChange={(v) => handleStepDataChange('empresa', v)} />
      case 'proyecto': return <StepProject data={projectData.proyecto} errors={errors} onChange={(v) => handleStepDataChange('proyecto', v)} />
      case 'problema': return <StepProblem data={projectData.problema} errors={errors} onChange={(v) => handleStepDataChange('problema', v)} />
      case 'funcionalidades': return <StepFeatures data={projectData.funcionalidades} errors={errors} onChange={(v) => handleStepDataChange('funcionalidades', v)} />
      case 'alcance': return <StepScope data={projectData.alcance} errors={errors} onChange={(v) => handleStepDataChange('alcance', v)} />
      case 'presupuesto': return <StepBudget data={projectData.presupuesto} errors={errors} onChange={(v) => handleStepDataChange('presupuesto', v)} />
      default: return <ProjectSummary projectData={projectData} onEditStep={handleEditStep} />
    }
  }

  return (
    <main id="configurador" className="cfg-main">
      {/* 1. Usamos Stagger para detectar el scroll de toda la sección */}
      <Stagger className="cfg-container">
        
        <div className="cfg-intro">
          {/* 2. Clases css-motion con delay secuencial */}
          <h1 className="css-motion mode-rise" style={{ transitionDelay: '0.1s' }}>
            Contanos tu proyecto
          </h1>
          <p className="css-motion mode-rise" style={{ transitionDelay: '0.2s' }}>
            Vamos a registrar cada decisión para entender qué necesitás y preparar una solución de software a medida.
          </p>
          <div className="cfg-intro__register css-motion mode-rise" style={{ transitionDelay: '0.3s' }} aria-hidden="true">
            <span />
            <span>Brief en construcción</span>
          </div>
        </div>

        {/* 3. El contenedor entero del formulario entra último */}
        <div ref={workspaceRef} className="cfg-workspace css-motion mode-rise" style={{ transitionDelay: '0.4s' }}>
          {submitted ? (
            <SuccessMessage onRestart={handleRestart} />
          ) : (
            <>
              <ProgressBar currentStepIndex={stepIndex} />

              <div className="cfg-step-stage" style={{ overflow: 'hidden' }}>
                <div
                  key={submitting ? 'submitting' : stepIndex}
                  className={`cfg-transition ${direction > 0 ? 'animate-step-forward' : 'animate-step-backward'}`}
                >
                  {submitting ? (
                    <div className="cfg-loading" role="status" aria-live="polite">
                      <span className="cfg-loading__line-native" aria-hidden="true" />
                      <strong>Registrando tu proyecto</strong>
                      <br/>
                      <span>Estamos enviando la información de forma segura.</span>
                    </div>
                  ) : (
                    renderStep()
                  )}
                </div>
              </div>

              {!submitting && (
                <>
                  {submitError && (
                    <p className="cfg-submit-error" role="alert" style={{ color: 'red', marginBottom: '10px' }}>
                      {submitError}
                    </p>
                  )}
                  <div className="cfg-actions">
                    <button
                      className="cfg-button cfg-button--secondary"
                      onClick={handleBack}
                      disabled={stepIndex === 0}
                      style={{ cursor: stepIndex === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      <span aria-hidden="true">←</span> Anterior
                    </button>

                    <button
                      className="cfg-button cfg-button--primary"
                      onClick={handleNext}
                      style={{ cursor: 'pointer' }}
                    >
                      {isSummaryStep ? 'Enviar solicitud' : 'Continuar'} <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </Stagger>
    </main>
  )
}

export default ProjectConfigurator