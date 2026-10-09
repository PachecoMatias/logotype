import { motion } from 'framer-motion'
import { configuratorSteps } from '../../data/projectOptions.js'
import { SPRING_SOFT } from '../../motion/tokens.js'

function ProgressBar({ currentStepIndex }) {
  const total = configuratorSteps.length
  const progress = (currentStepIndex + 1) / total

  return (
    <div className="cfg-progress">
      <div className="cfg-progress__mobile-meta">
        <span>Paso {currentStepIndex + 1} de {total}</span>
        <strong>{configuratorSteps[currentStepIndex].label}</strong>
      </div>

      <div
        className="cfg-progress__track"
        role="progressbar"
        aria-label="Progreso del relevamiento"
        aria-valuemin="1"
        aria-valuemax={total}
        aria-valuenow={currentStepIndex + 1}
      >
        <motion.div
          className="cfg-progress__fill"
          initial={false}
          animate={{ scaleX: progress }}
          transition={SPRING_SOFT}
        />
      </div>

      <ol className="cfg-progress__steps">
        {configuratorSteps.map((step, index) => (
          <li
            key={step.id}
            className={`cfg-progress__step${index === currentStepIndex ? ' cfg-progress__step--current' : ''}${
              index < currentStepIndex ? ' cfg-progress__step--complete' : ''
            }`}
            aria-current={index === currentStepIndex ? 'step' : undefined}
          >
            <span className="cfg-progress__marker" aria-hidden="true">
              {index === currentStepIndex && (
                <motion.span className="cfg-progress__current-marker" layoutId="cfg-current-step" />
              )}
            </span>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{step.label}</strong>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default ProgressBar
