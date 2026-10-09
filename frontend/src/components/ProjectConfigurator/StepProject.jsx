import { motion } from 'framer-motion'
import OptionCard from './OptionCard.jsx'
import { projectTypes } from '../../data/projectOptions.js'
import { stepContainer, stepField } from '../../motion/tokens.js'

function StepProject({ data, errors, onChange }) {
  return (
    <motion.div className="cfg-step" variants={stepContainer} initial="hidden" animate="show">
      <motion.h2 className="cfg-step__title" variants={stepField}>¿Qué solución estás buscando?</motion.h2>
      <motion.p className="cfg-step__intro" variants={stepField}>Elegí la alternativa que más se acerque a tu idea; después vamos a precisar el alcance.</motion.p>

      <div className="cfg-option-grid">
        {projectTypes.map((type, index) => (
          <OptionCard
            key={type.id}
            icon={type.icon}
            title={type.title}
            description={type.description}
            index={index}
            selected={data.tipoProyecto === type.id}
            onClick={() => onChange({ ...data, tipoProyecto: type.id })}
          />
        ))}
      </div>

      {errors.tipoProyecto && <motion.p className="cfg-field-error" variants={stepField}>{errors.tipoProyecto}</motion.p>}
    </motion.div>
  )
}

export default StepProject
