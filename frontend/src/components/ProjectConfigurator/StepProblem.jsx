import { AnimatePresence, motion } from 'framer-motion'
import Chip from './Chip.jsx'
import { improvementGoals } from '../../data/projectOptions.js'
import { stepContainer, stepField, EASE_OUT, DURATION } from '../../motion/tokens.js'

const followIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: DURATION.layout, ease: EASE_OUT },
}

function StepProblem({ data, errors, onChange }) {
  const setField = (field) => (e) => onChange({ ...data, [field]: e.target.value })

  const toggleObjetivo = (goal) => {
    const exists = data.objetivos.includes(goal)
    const objetivos = exists
      ? data.objetivos.filter((g) => g !== goal)
      : [...data.objetivos, goal]
    onChange({ ...data, objetivos })
  }

  return (
    <motion.div className="cfg-step" variants={stepContainer} initial="hidden" animate="show">
      <motion.h2 className="cfg-step__title" variants={stepField}>Contanos qué necesitás resolver</motion.h2>
      <motion.p className="cfg-step__intro" variants={stepField}>
        Describí la situación actual con tus palabras; nos ayuda a entender el problema antes de pensar la solución.
      </motion.p>

      <motion.div className="cfg-field" variants={stepField}>
        <label htmlFor="problemaActual">
          ¿Qué problema tiene actualmente tu empresa?<span className="cfg-required">*</span>
        </label>
        <textarea
          id="problemaActual"
          className="cfg-control"
          value={data.problemaActual}
          onChange={setField('problemaActual')}
          placeholder="Ejemplo: Actualmente gestionamos los pedidos mediante planillas de Excel y necesitamos centralizar la información..."
        />
        {errors.problemaActual && <p className="cfg-field-error">{errors.problemaActual}</p>}
      </motion.div>

      <motion.div className="cfg-field" variants={stepField}>
        <label htmlFor="procesoActual">
          ¿Cómo realizan actualmente este proceso?<span className="cfg-required">*</span>
        </label>
        <textarea
          id="procesoActual"
          className="cfg-control"
          value={data.procesoActual}
          onChange={setField('procesoActual')}
          placeholder="Contanos brevemente cómo funciona actualmente..."
        />
        {errors.procesoActual && <p className="cfg-field-error">{errors.procesoActual}</p>}
      </motion.div>

      <motion.div className="cfg-field" variants={stepField}>
        <label>
          ¿Qué esperás mejorar con el nuevo sistema?<span className="cfg-required">*</span>
        </label>
        <div className="cfg-chip-grid">
          {improvementGoals.map((goal, index) => (
            <Chip
              key={goal}
              index={index}
              label={goal}
              selected={data.objetivos.includes(goal)}
              onClick={() => toggleObjetivo(goal)}
            />
          ))}
        </div>
        {errors.objetivos && <p className="cfg-field-error">{errors.objetivos}</p>}
      </motion.div>

      <AnimatePresence initial={false}>
        {data.objetivos.includes('Otro') && (
          <motion.div className="cfg-field" key="objetivosOtro" {...followIn}>
            <label htmlFor="objetivosOtro">
              Contanos cuál<span className="cfg-required">*</span>
            </label>
            <input
              id="objetivosOtro"
              className="cfg-control"
              type="text"
              value={data.objetivosOtro}
              onChange={setField('objetivosOtro')}
            />
            {errors.objetivosOtro && <p className="cfg-field-error">{errors.objetivosOtro}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default StepProblem
