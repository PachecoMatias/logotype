import { useState } from 'react'
import { motion } from 'framer-motion'
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
import { EASE_OUT, DURATION } from '../../motion/tokens.js'

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

  // Step transition: the incoming step mounts and animates in with a short
  // directional shift; the outgoing step unmounts immediately. There is no
  // AnimatePresence exit, so the stage never empties between steps and the step
  // is never double-animated on remount. Fast enough to feel instant.
  const stepTransition = { duration: DURATION.state, ease: EASE_OUT }

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
    <main id="configurador" className="cfg-main">
      <div className="cfg-container">
        <div className="cfg-intro">
          <h1>Contanos tu proyecto</h1>
          <p>Vamos a registrar cada decisión para entender qué necesitás y preparar una solución de software a medida.</p>
          <div className="cfg-intro__register" aria-hidden="true">
            <span />
            <span>Brief en construcción</span>
          </div>
        </div>

        <div className="cfg-workspace">
          {submitted ? (
            <SuccessMessage onRestart={handleRestart} />
          ) : (
            <>
              <ProgressBar currentStepIndex={stepIndex} />

              <div className="cfg-step-stage">
                <motion.div
                  key={stepIndex}
                  className="cfg-transition"
                  initial={{ opacity: 0, x: direction > 0 ? 26 : -26 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={stepTransition}
                >
                  {submitting ? (
                    <div className="cfg-loading" role="status" aria-live="polite">
                      <motion.span
                        className="cfg-loading__line"
                        aria-hidden="true"
                        style={{ transformOrigin: 'left' }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: [0, 1, 1, 0] }}
                        transition={{ duration: 1.6, times: [0, 0.4, 0.7, 1], repeat: Infinity, ease: EASE_OUT }}
                      />
                      <strong>Registrando tu proyecto</strong>
                      <span>Estamos enviando la información de forma segura.</span>
                    </div>
                  ) : (
                    renderStep()
                  )}
                </motion.div>
              </div>


              {!submitting && (
                <>
                  {submitError && (
                    <p className="cfg-submit-error" role="alert">{submitError}</p>
                  )}
                  <div className="cfg-actions">
                    <motion.button
                      className="cfg-button cfg-button--secondary"
                      onClick={handleBack}
                      disabled={stepIndex === 0}
                      whileHover={stepIndex === 0 ? undefined : { x: -2 }}
                      whileTap={stepIndex === 0 ? undefined : { scale: 0.98 }}
                      transition={{ duration: DURATION.feedback, ease: EASE_OUT }}
                    >
                      <span aria-hidden="true">←</span> Anterior
                    </motion.button>

                    <motion.button
                      className="cfg-button cfg-button--primary"
                      onClick={handleNext}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: DURATION.feedback, ease: EASE_OUT }}
                    >
                      {isSummaryStep ? 'Enviar solicitud' : 'Continuar'} <span aria-hidden="true">→</span>
                    </motion.button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default ProjectConfigurator
