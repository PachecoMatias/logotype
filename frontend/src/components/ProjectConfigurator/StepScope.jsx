import Chip from './Chip.jsx'
import { platforms, userRanges, yesNoUnsure, userTypes } from '../../data/projectOptions.js'

function StepScope({ data, errors, onChange }) {
  const togglePlatform = (platform) => {
    const exists = data.plataformas.includes(platform)
    const plataformas = exists
      ? data.plataformas.filter((p) => p !== platform)
      : [...data.plataformas, platform]
    onChange({ ...data, plataformas })
  }

  const toggleTipoUsuario = (tipo) => {
    const exists = data.tiposUsuario.includes(tipo)
    const tiposUsuario = exists
      ? data.tiposUsuario.filter((t) => t !== tipo)
      : [...data.tiposUsuario, tipo]
    onChange({ ...data, tiposUsuario })
  }

  return (
    <div>
      <h3 className="step-title">Definamos algunas características</h3>
      <p className="step-subtitle">Esto nos ayuda a dimensionar mejor el alcance del proyecto.</p>

      <div className="form-group">
        <label>
          Plataformas<span className="required">*</span>
        </label>
        <div className="chip-grid">
          {platforms.map((platform) => (
            <Chip
              key={platform}
              label={platform}
              selected={data.plataformas.includes(platform)}
              onClick={() => togglePlatform(platform)}
            />
          ))}
        </div>
        {errors.plataformas && <p className="field-error">{errors.plataformas}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="cantidadUsuarios">
          Cantidad estimada de usuarios<span className="required">*</span>
        </label>
        <select
          id="cantidadUsuarios"
          className="form-control"
          value={data.cantidadUsuarios}
          onChange={(e) => onChange({ ...data, cantidadUsuarios: e.target.value })}
        >
          <option value="">Seleccioná una opción</option>
          {userRanges.map((range) => (
            <option key={range} value={range}>
              {range}
            </option>
          ))}
        </select>
        {errors.cantidadUsuarios && <p className="field-error">{errors.cantidadUsuarios}</p>}
      </div>

      <div className="form-group">
        <label>
          ¿Necesitás diferentes tipos de usuarios?<span className="required">*</span>
        </label>
        <div className="chip-grid">
          {yesNoUnsure.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={data.necesitaTiposUsuario === option}
              onClick={() => onChange({ ...data, necesitaTiposUsuario: option })}
            />
          ))}
        </div>
        {errors.necesitaTiposUsuario && <p className="field-error">{errors.necesitaTiposUsuario}</p>}
      </div>

      {data.necesitaTiposUsuario === 'Sí' && (
        <div className="form-group">
          <label>
            ¿Qué tipos de usuarios?<span className="required">*</span>
          </label>
          <div className="chip-grid">
            {userTypes.map((tipo) => (
              <Chip
                key={tipo}
                label={tipo}
                selected={data.tiposUsuario.includes(tipo)}
                onClick={() => toggleTipoUsuario(tipo)}
              />
            ))}
          </div>
          {errors.tiposUsuario && <p className="field-error">{errors.tiposUsuario}</p>}
        </div>
      )}

      {data.tiposUsuario.includes('Otro') && (
        <div className="form-group">
          <label htmlFor="tiposUsuarioOtro">
            Contanos cuál<span className="required">*</span>
          </label>
          <input
            id="tiposUsuarioOtro"
            className="form-control"
            type="text"
            value={data.tiposUsuarioOtro}
            onChange={(e) => onChange({ ...data, tiposUsuarioOtro: e.target.value })}
          />
          {errors.tiposUsuarioOtro && <p className="field-error">{errors.tiposUsuarioOtro}</p>}
        </div>
      )}
    </div>
  )
}

export default StepScope
