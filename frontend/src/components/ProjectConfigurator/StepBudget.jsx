import { motion } from 'framer-motion'
import Chip from './Chip.jsx'
import { budgetRanges, timelineRanges } from '../../data/projectOptions.js'
import { stepContainer, stepField } from '../../motion/tokens.js'

function StepBudget({ data, errors, onChange }) {
  return (
    <motion.div className="cfg-step" variants={stepContainer} initial="hidden" animate="show">
      <motion.h2 className="cfg-step__title" variants={stepField}>Acordemos los últimos detalles</motion.h2>
      <motion.p className="cfg-step__intro" variants={stepField}>Indicá el marco de inversión y tiempo que tenés en mente; puede ser una primera estimación.</motion.p>

      <motion.div className="cfg-field" variants={stepField}>
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
        {errors.presupuesto && <p className="cfg-field-error">{errors.presupuesto}</p>}
      </motion.div>

      <motion.div className="cfg-field" variants={stepField}>
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
        {errors.plazo && <p className="cfg-field-error">{errors.plazo}</p>}
      </motion.div>

      <motion.div className="cfg-field" variants={stepField}>
        <label htmlFor="infoAdicional">¿Hay algo más que consideres importante que nuestro equipo deba conocer?</label>
        <textarea
          id="infoAdicional"
          className="cfg-control"
          value={data.infoAdicional}
          onChange={(e) => onChange({ ...data, infoAdicional: e.target.value })}
          placeholder="Contanos cualquier detalle adicional (opcional)"
        />
      </motion.div>
    </motion.div>
  )
}

export default StepBudget
