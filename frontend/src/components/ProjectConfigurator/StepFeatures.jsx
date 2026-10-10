
import Chip from './Chip.jsx'
import { featuresList } from '../../data/projectOptions.js'

import { childVariants, fieldErrorMotion } from '../../motion/variants.js'

function StepFeatures({ data, errors, onChange }) {
  const toggleFeature = (feature) => {
    const exists = data.seleccionadas.includes(feature)
    const seleccionadas = exists
      ? data.seleccionadas.filter((f) => f !== feature)
      : [...data.seleccionadas, feature]
    onChange({ ...data, seleccionadas })
  }

  return (
    <div className="cfg-step" viewport={false} mount>
      <h2 className="cfg-step__title" variants={childVariants}>¿Qué debería poder hacer tu sistema?</h2>
      <p className="cfg-step__intro" variants={childVariants}>
        Marcá las funciones que hoy imaginás. No hace falta que tengas todos los requisitos definidos.
      </p>

      <div className="cfg-chip-grid cfg-chip-grid--dense" variants={childVariants}>
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
      {errors.seleccionadas && <p className="cfg-field-error" {...fieldErrorMotion}>{errors.seleccionadas}</p>}

      {data.seleccionadas.includes('Otra') && (
          <div className="cfg-field cfg-field--followup" variants={childVariants}>
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
            {errors.otra && <p className="cfg-field-error" {...fieldErrorMotion}>{errors.otra}</p>}
          </div>
      )}
    </div>
  )
}

export default StepFeatures
