import Chip from './Chip.jsx'
import { featuresList } from '../../data/projectOptions.js'

function StepFeatures({ data, errors, onChange }) {
  const toggleFeature = (feature) => {
    const exists = data.seleccionadas.includes(feature)
    const seleccionadas = exists
      ? data.seleccionadas.filter((f) => f !== feature)
      : [...data.seleccionadas, feature]
    onChange({ ...data, seleccionadas })
  }

  return (
    <div>
      <h3 className="step-title">¿Qué debería poder hacer tu sistema?</h3>
      <p className="step-subtitle">
        Seleccioná las funcionalidades que consideres necesarias. No es necesario que tengas
        todos los requisitos definidos.
      </p>

      <div className="chip-grid">
        {featuresList.map((feature) => (
          <Chip
            key={feature}
            label={feature}
            selected={data.seleccionadas.includes(feature)}
            onClick={() => toggleFeature(feature)}
          />
        ))}
      </div>
      {errors.seleccionadas && <p className="field-error">{errors.seleccionadas}</p>}

      {data.seleccionadas.includes('Otra') && (
        <div className="form-group" style={{ marginTop: 20 }}>
          <label htmlFor="otra">
            Contanos cuál<span className="required">*</span>
          </label>
          <input
            id="otra"
            className="form-control"
            type="text"
            value={data.otra}
            onChange={(e) => onChange({ ...data, otra: e.target.value })}
          />
          {errors.otra && <p className="field-error">{errors.otra}</p>}
        </div>
      )}
    </div>
  )
}

export default StepFeatures
