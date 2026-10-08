import OptionCard from './OptionCard.jsx'
import { projectTypes } from '../../data/projectOptions.js'

function StepProject({ data, errors, onChange }) {
  return (
    <div className="cfg-step">
      <h2 className="cfg-step__title">¿Qué solución estás buscando?</h2>
      <p className="cfg-step__intro">Elegí la alternativa que más se acerque a tu idea; después vamos a precisar el alcance.</p>

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

      {errors.tipoProyecto && <p className="cfg-field-error">{errors.tipoProyecto}</p>}
    </div>
  )
}

export default StepProject
