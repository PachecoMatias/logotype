import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ProgressBar from './ProgressBar.jsx'
import StepCompany from './StepCompany.jsx'
import StepProject from './StepProject.jsx'
import StepProblem from './StepProblem.jsx'
import StepFeatures from './StepFeatures.jsx'
import StepScope from './StepScope.jsx'
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

function ProjectConfigurator({onBack}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [projectData, setProjectData] = useState(initialProjectData)
  const [errors, setErrors] = useState({})
  const [direction, setDirection] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const isSummaryStep = stepIndex === configuratorSteps.length - 1

  const goToStep = (index, dir) => {
    setDirection(dir)
    setStepIndex(index)
    setErrors({})
  }

  const handleStepDataChange = (key, value) => {
    setProjectData((prev) => ({ ...prev, [key]: value }))
  }

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

  const variants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
  }

  const renderStep = () => {
    switch (stepKeys[stepIndex]) {
      case 'empresa':
        return (
          <StepCompany
            data={projectData.empresa}
            errors={errors}
            onChange={(value) => handleStepDataChange('empresa', value)}
          />
        )
      case 'proyecto':
        return (
          <StepProject
            data={projectData.proyecto}
            errors={errors}
            onChange={(value) => handleStepDataChange('proyecto', value)}
          />
        )
      case 'problema':
        return (
          <StepProblem
            data={projectData.problema}
            errors={errors}
            onChange={(value) => handleStepDataChange('problema', value)}
          />
        )
      case 'funcionalidades':
        return (
          <StepFeatures
            data={projectData.funcionalidades}
            errors={errors}
            onChange={(value) => handleStepDataChange('funcionalidades', value)}
          />
        )
      case 'alcance':
        return (
          <StepScope
            data={projectData.alcance}
            errors={errors}
            onChange={(value) => handleStepDataChange('alcance', value)}
          />
        )
      case 'presupuesto':
        return (
          <StepBudget
            data={projectData.presupuesto}
            errors={errors}
            onChange={(value) => handleStepDataChange('presupuesto', value)}
          />
        )
      default:
        return <ProjectSummary projectData={projectData} onEditStep={handleEditStep} />
    }
  }

  return (
    <section id="configurador" className="configurator-section configurator-page">
      <div className="container">
        {/* Si ya tenías un botón "← Volver al inicio" acá arriba, se puede borrar: ahora está en la topbar */}

        <div className="configurator-hero-title">
          <span className="configurator-eyebrow">Relevamiento inicial de proyecto</span>
          <h2>Contanos tu proyecto</h2>
          <p>
            Contanos qué necesitás y nuestro equipo analizará tu solicitud para proponerte una
            solución de software a medida.
          </p>
        </div>

        <div className="configurator-shell">
          {submitted ? (
            <SuccessMessage onRestart={handleRestart} />
          ) : (
            <>
              <ProgressBar currentStepIndex={stepIndex} />

              <div className="configurator-step-content">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={stepIndex}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                  >
                    {submitting ? (
                      <div className="loading-dots" aria-label="Enviando solicitud">
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : (
                      renderStep()
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {!submitting && (
                <>
                  {submitError && (
                    <p className="panel-state-msg panel-state-error">{submitError}</p>
                  )}
                  <div className="step-nav">
                  <button
                    className="btn btn-outline"
                    onClick={handleBack}
                    disabled={stepIndex === 0}
                  >
                    ← Anterior
                  </button>

                  <button className="btn btn-primary" onClick={handleNext}>
                    {isSummaryStep ? 'Enviar solicitud' : 'Continuar →'}
                  </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default ProjectConfigurator
