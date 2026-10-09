import { motion } from 'framer-motion'
import Chip from './Chip.jsx'
import { budgetRanges, timelineRanges } from '../../data/projectOptions.js'
import RevealGroup from '../../motion/RevealGroup.jsx'
import { childVariants, fieldErrorMotion } from '../../motion/variants.js'

function StepBudget({ data, errors, onChange }) {
  return (
    <RevealGroup className="cfg-step" viewport={false} mount>
      <motion.h2 className="cfg-step__title" variants={childVariants}>Acordemos los últimos detalles</motion.h2>
      <motion.p className="cfg-step__intro" variants={childVariants}>Indicá el marco de inversión y tiempo que tenés en mente; puede ser una primera estimación.</motion.p>

      <motion.div className="cfg-field" variants={childVariants}>
        <label>
          Presupuesto estimado<span className="cfg-required">*</span>
        </label>
        <div className="cfg-chip-grid">
          {budgetRanges.map((range, index) => (
            <Chip
              key={range}
              index={index}
              label={range}
              selected={data.presupuesto === range}
              onClick={() => onChange({ ...data, presupuesto: range })}
            />
          ))}
        </div>
        {errors.presupuesto && <motion.p className="cfg-field-error" {...fieldErrorMotion}>{errors.presupuesto}</motion.p>}
      </motion.div>

      <motion.div className="cfg-field" variants={childVariants}>
        <label>
          Plazo esperado<span className="cfg-required">*</span>
        </label>
        <div className="cfg-chip-grid">
          {timelineRanges.map((range, index) => (
            <Chip
              key={range}
              index={index}
              label={range}
              selected={data.plazo === range}
              onClick={() => onChange({ ...data, plazo: range })}
            />
          ))}
        </div>
        {errors.plazo && <motion.p className="cfg-field-error" {...fieldErrorMotion}>{errors.plazo}</motion.p>}
      </motion.div>

      <motion.div className="cfg-field" variants={childVariants}>
        <label htmlFor="infoAdicional">¿Hay algo más que consideres importante que nuestro equipo deba conocer?</label>
        <textarea
          id="infoAdicional"
          className="cfg-control"
          value={data.infoAdicional}
          onChange={(e) => onChange({ ...data, infoAdicional: e.target.value })}
          placeholder="Contanos cualquier detalle adicional (opcional)"
        />
      </motion.div>
    </RevealGroup>
  )
}

export default StepBudget
