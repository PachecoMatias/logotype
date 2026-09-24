import { motion } from 'framer-motion'
import { configuratorSteps } from '../../data/projectOptions.js'

function ProgressBar({ currentStepIndex }) {
  const total = configuratorSteps.length
  const percent = (currentStepIndex / (total - 1)) * 100

  return (
    <div className="progress-wrap">
      <div className="progress-track">
        <motion.div
          className="progress-fill"
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      <div className="progress-steps">
        {configuratorSteps.map((step, index) => (
          <span
            key={step.id}
            className={`progress-step${index === currentStepIndex ? ' active' : ''}${
              index < currentStepIndex ? ' done' : ''
            }`}
          >
            {String(index + 1).padStart(2, '0')} {step.label}
          </span>
        ))}
      </div>

      <p className="progress-meta">
        Paso {currentStepIndex + 1} de {total}
      </p>
    </div>
  )
}

export default ProgressBar
