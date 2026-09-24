import OptionCard from './OptionCard.jsx'
import { projectTypes } from '../../data/projectOptions.js'

function StepProject({ data, errors, onChange }) {
  return (
    <div>
      <h3 className="step-title">¿Qué solución estás buscando?</h3>
      <p className="step-subtitle">Seleccioná el tipo de solución que mejor representa tu proyecto.</p>

      <div className="option-grid">
        {projectTypes.map((type) => (
          <OptionCard
            key={type.id}
            icon={type.icon}
            title={type.title}
            description={type.description}
            selected={data.tipoProyecto === type.id}
            onClick={() => onChange({ ...data, tipoProyecto: type.id })}
          />
        ))}
      </div>

      {errors.tipoProyecto && <p className="field-error">{errors.tipoProyecto}</p>}
    </div>
  )
}

export default StepProject
