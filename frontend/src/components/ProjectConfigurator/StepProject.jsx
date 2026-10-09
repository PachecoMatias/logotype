import { motion } from 'framer-motion'
import OptionCard from './OptionCard.jsx'
import { projectTypes } from '../../data/projectOptions.js'
import RevealGroup from '../../motion/RevealGroup.jsx'
import { childVariants, fieldErrorMotion } from '../../motion/variants.js'

function StepProject({ data, errors, onChange }) {
  return (
    <RevealGroup className="cfg-step" viewport={false} mount>
      <motion.h2 className="cfg-step__title" variants={childVariants}>¿Qué solución estás buscando?</motion.h2>
      <motion.p className="cfg-step__intro" variants={childVariants}>Elegí la alternativa que más se acerque a tu idea; después vamos a precisar el alcance.</motion.p>

      <motion.div className="cfg-option-grid" variants={childVariants}>
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
      </motion.div>

      {errors.tipoProyecto && <motion.p className="cfg-field-error" {...fieldErrorMotion}>{errors.tipoProyecto}</motion.p>}
    </RevealGroup>
  )
}

export default StepProject
