import Chip from './Chip.jsx'
import { budgetRanges, timelineRanges } from '../../data/projectOptions.js'

function StepBudget({ data, errors, onChange }) {
  return (
    <div>
      <h3 className="step-title">Últimos detalles</h3>
      <p className="step-subtitle">Estos datos nos ayudan a dimensionar el proyecto.</p>

      <div className="form-group">
        <label>
          Presupuesto estimado<span className="required">*</span>
        </label>
        <div className="chip-grid">
          {budgetRanges.map((range) => (
            <Chip
              key={range}
              label={range}
              selected={data.presupuesto === range}
              onClick={() => onChange({ ...data, presupuesto: range })}
            />
          ))}
        </div>
        {errors.presupuesto && <p className="field-error">{errors.presupuesto}</p>}
      </div>

      <div className="form-group">
        <label>
          Plazo esperado<span className="required">*</span>
        </label>
        <div className="chip-grid">
          {timelineRanges.map((range) => (
            <Chip
              key={range}
              label={range}
              selected={data.plazo === range}
              onClick={() => onChange({ ...data, plazo: range })}
            />
          ))}
        </div>
        {errors.plazo && <p className="field-error">{errors.plazo}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="infoAdicional">¿Hay algo más que consideres importante que nuestro equipo deba conocer?</label>
        <textarea
          id="infoAdicional"
          className="form-control"
          value={data.infoAdicional}
          onChange={(e) => onChange({ ...data, infoAdicional: e.target.value })}
          placeholder="Contanos cualquier detalle adicional (opcional)"
        />
      </div>
    </div>
  )
}

export default StepBudget
