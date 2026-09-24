import Chip from './Chip.jsx'
import { improvementGoals } from '../../data/projectOptions.js'

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
    <div>
      <h3 className="step-title">Contanos qué necesitás resolver</h3>
      <p className="step-subtitle">
        Esta información nos ayudará a comprender el problema y pensar una solución adecuada.
      </p>

      <div className="form-group">
        <label htmlFor="problemaActual">
          ¿Qué problema tiene actualmente tu empresa?<span className="required">*</span>
        </label>
        <textarea
          id="problemaActual"
          className="form-control"
          value={data.problemaActual}
          onChange={setField('problemaActual')}
          placeholder="Ejemplo: Actualmente gestionamos los pedidos mediante planillas de Excel y necesitamos centralizar la información..."
        />
        {errors.problemaActual && <p className="field-error">{errors.problemaActual}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="procesoActual">
          ¿Cómo realizan actualmente este proceso?<span className="required">*</span>
        </label>
        <textarea
          id="procesoActual"
          className="form-control"
          value={data.procesoActual}
          onChange={setField('procesoActual')}
          placeholder="Contanos brevemente cómo funciona actualmente..."
        />
        {errors.procesoActual && <p className="field-error">{errors.procesoActual}</p>}
      </div>

      <div className="form-group">
        <label>
          ¿Qué esperás mejorar con el nuevo sistema?<span className="required">*</span>
        </label>
        <div className="chip-grid">
          {improvementGoals.map((goal) => (
            <Chip
              key={goal}
              label={goal}
              selected={data.objetivos.includes(goal)}
              onClick={() => toggleObjetivo(goal)}
            />
          ))}
        </div>
        {errors.objetivos && <p className="field-error">{errors.objetivos}</p>}
      </div>

      {data.objetivos.includes('Otro') && (
        <div className="form-group">
          <label htmlFor="objetivosOtro">
            Contanos cuál<span className="required">*</span>
          </label>
          <input
            id="objetivosOtro"
            className="form-control"
            type="text"
            value={data.objetivosOtro}
            onChange={setField('objetivosOtro')}
          />
          {errors.objetivosOtro && <p className="field-error">{errors.objetivosOtro}</p>}
        </div>
      )}
    </div>
  )
}

export default StepProblem
