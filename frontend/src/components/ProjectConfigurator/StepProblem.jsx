
import Chip from './Chip.jsx'
import { improvementGoals } from '../../data/projectOptions.js'

import { childVariants, fieldErrorMotion } from '../../motion/variants.js'

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
    <div className="cfg-step" viewport={false} mount>
      <h2 className="cfg-step__title" variants={childVariants}>Contanos qué necesitás resolver</h2>
      <p className="cfg-step__intro" variants={childVariants}>
        Describí la situación actual con tus palabras; nos ayuda a entender el problema antes de pensar la solución.
      </p>

      <div className="cfg-field" variants={childVariants}>
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
        {errors.problemaActual && <p className="cfg-field-error" {...fieldErrorMotion}>{errors.problemaActual}</p>}
      </div>

      <div className="cfg-field" variants={childVariants}>
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
        {errors.procesoActual && <p className="cfg-field-error" {...fieldErrorMotion}>{errors.procesoActual}</p>}
      </div>

      <div className="cfg-field" variants={childVariants}>
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
        {errors.objetivos && <p className="cfg-field-error" {...fieldErrorMotion}>{errors.objetivos}</p>}
      </div>

      {data.objetivos.includes('Otro') && (
          <div className="cfg-field" variants={childVariants}>
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
            {errors.objetivosOtro && <p className="cfg-field-error" {...fieldErrorMotion}>{errors.objetivosOtro}</p>}
          </div>
      )}
    </div>
  )
}

export default StepProblem
