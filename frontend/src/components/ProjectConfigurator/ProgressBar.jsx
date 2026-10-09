import { motion } from 'framer-motion'
import { configuratorSteps } from '../../data/projectOptions.js'
import { EASE_OUT, DURATION } from '../../motion/tokens.js'

// The step list assembles once when the configurator opens; the fill tracks
// progress as a single springing line.
const stepList = { hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }

const stepItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.layout, ease: EASE_OUT } },
}

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
          transition={{ duration: DURATION.layout, ease: EASE_OUT }}
        />
      </div>

      <motion.ol className="cfg-progress__steps" variants={stepList} initial="hidden" animate="visible">
        {configuratorSteps.map((step, index) => (
          <motion.li
            key={step.id}
            variants={stepItem}
            className={`cfg-progress__step${index === currentStepIndex ? ' cfg-progress__step--current' : ''}${
              index < currentStepIndex ? ' cfg-progress__step--complete' : ''
            }`}
            aria-current={index === currentStepIndex ? 'step' : undefined}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{step.label}</strong>
          </motion.li>
        ))}
      </motion.ol>
    </div>
  )
}

export default ProgressBar
