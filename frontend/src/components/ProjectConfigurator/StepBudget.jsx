import Chip from './Chip.jsx'
import { budgetRanges, timelineRanges } from '../../data/projectOptions.js'

function StepBudget({ data, errors, onChange }) {
  return (
    <div className="cfg-step">
      <h2 className="cfg-step__title">Acordemos los últimos detalles</h2>
      <p className="cfg-step__intro">Indicá el marco de inversión y tiempo que tenés en mente; puede ser una primera estimación.</p>

      <div className="cfg-field">
        <label>
          Presupuesto estimado<span className="cfg-required">*</span>
        </label>
        <div className="cfg-chip-grid">
          {budgetRanges.map((range) => (
            <Chip
              key={range}
              label={range}
              selected={data.presupuesto === range}
              onClick={() => onChange({ ...data, presupuesto: range })}
            />
          ))}
        </div>
        {errors.presupuesto && <p className="cfg-field-error">{errors.presupuesto}</p>}
      </div>

      <div className="cfg-field">
        <label>
          Plazo esperado<span className="cfg-required">*</span>
        </label>
        <div className="cfg-chip-grid">
          {timelineRanges.map((range) => (
            <Chip
              key={range}
              label={range}
              selected={data.plazo === range}
              onClick={() => onChange({ ...data, plazo: range })}
            />
          ))}
        </div>
        {errors.plazo && <p className="cfg-field-error">{errors.plazo}</p>}
      </div>

      <div className="cfg-field">
        <label htmlFor="infoAdicional">¿Hay algo más que consideres importante que nuestro equipo deba conocer?</label>
        <textarea
          id="infoAdicional"
          className="cfg-control"
          value={data.infoAdicional}
          onChange={(e) => onChange({ ...data, infoAdicional: e.target.value })}
          placeholder="Contanos cualquier detalle adicional (opcional)"
        />
      </div>
    </div>
  )
}

export default StepBudget
