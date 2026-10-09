import { AnimatePresence, motion } from 'framer-motion'
import Chip from './Chip.jsx'
import { featuresList } from '../../data/projectOptions.js'
import { stepContainer, stepField, EASE_OUT, DURATION } from '../../motion/tokens.js'

const followIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: DURATION.layout, ease: EASE_OUT },
}

function StepFeatures({ data, errors, onChange }) {
  const toggleFeature = (feature) => {
    const exists = data.seleccionadas.includes(feature)
    const seleccionadas = exists
      ? data.seleccionadas.filter((f) => f !== feature)
      : [...data.seleccionadas, feature]
    onChange({ ...data, seleccionadas })
  }

  return (
    <motion.div className="cfg-step" variants={stepContainer} initial="hidden" animate="show">
      <motion.h2 className="cfg-step__title" variants={stepField}>¿Qué debería poder hacer tu sistema?</motion.h2>
      <motion.p className="cfg-step__intro" variants={stepField}>
        Marcá las funciones que hoy imaginás. No hace falta que tengas todos los requisitos definidos.
      </motion.p>

      <div className="cfg-chip-grid cfg-chip-grid--dense">
        {featuresList.map((feature, index) => (
          <Chip
            key={feature}
            index={index}
            label={feature}
            selected={data.seleccionadas.includes(feature)}
            onClick={() => toggleFeature(feature)}
          />
        ))}
      </div>
      {errors.seleccionadas && <motion.p className="cfg-field-error" variants={stepField}>{errors.seleccionadas}</motion.p>}

      <AnimatePresence initial={false}>
        {data.seleccionadas.includes('Otra') && (
          <motion.div className="cfg-field cfg-field--followup" key="otra" {...followIn}>
            <label htmlFor="otra">
              Contanos cuál<span className="cfg-required">*</span>
            </label>
            <input
              id="otra"
              className="cfg-control"
              type="text"
              value={data.otra}
              onChange={(e) => onChange({ ...data, otra: e.target.value })}
            />
            {errors.otra && <p className="cfg-field-error">{errors.otra}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default StepFeatures
