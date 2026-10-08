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
    <div className="cfg-step">
      <h2 className="cfg-step__title">Definamos algunas características</h2>
      <p className="cfg-step__intro">Ubicá dónde se va a usar y quiénes van a participar para que podamos dimensionar el alcance.</p>

      <div className="cfg-field">
        <label>
          Plataformas<span className="cfg-required">*</span>
        </label>
        <div className="cfg-chip-grid">
          {platforms.map((platform) => (
            <Chip
              key={platform}
              label={platform}
              selected={data.plataformas.includes(platform)}
              onClick={() => togglePlatform(platform)}
            />
          ))}
        </div>
        {errors.plataformas && <p className="cfg-field-error">{errors.plataformas}</p>}
      </div>

      <div className="cfg-field">
        <label htmlFor="cantidadUsuarios">
          Cantidad estimada de usuarios<span className="cfg-required">*</span>
        </label>
        <select
          id="cantidadUsuarios"
          className="cfg-control"
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
        {errors.cantidadUsuarios && <p className="cfg-field-error">{errors.cantidadUsuarios}</p>}
      </div>

      <div className="cfg-field">
        <label>
          ¿Necesitás diferentes tipos de usuarios?<span className="cfg-required">*</span>
        </label>
        <div className="cfg-chip-grid">
          {yesNoUnsure.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={data.necesitaTiposUsuario === option}
              onClick={() => onChange({ ...data, necesitaTiposUsuario: option })}
            />
          ))}
        </div>
        {errors.necesitaTiposUsuario && <p className="cfg-field-error">{errors.necesitaTiposUsuario}</p>}
      </div>

      {data.necesitaTiposUsuario === 'Sí' && (
        <div className="cfg-field">
          <label>
            ¿Qué tipos de usuarios?<span className="cfg-required">*</span>
          </label>
          <div className="cfg-chip-grid">
            {userTypes.map((tipo) => (
              <Chip
                key={tipo}
                label={tipo}
                selected={data.tiposUsuario.includes(tipo)}
                onClick={() => toggleTipoUsuario(tipo)}
              />
            ))}
          </div>
          {errors.tiposUsuario && <p className="cfg-field-error">{errors.tiposUsuario}</p>}
        </div>
      )}

      {data.tiposUsuario.includes('Otro') && (
        <div className="cfg-field">
          <label htmlFor="tiposUsuarioOtro">
            Contanos cuál<span className="cfg-required">*</span>
          </label>
          <input
            id="tiposUsuarioOtro"
            className="cfg-control"
            type="text"
            value={data.tiposUsuarioOtro}
            onChange={(e) => onChange({ ...data, tiposUsuarioOtro: e.target.value })}
          />
          {errors.tiposUsuarioOtro && <p className="cfg-field-error">{errors.tiposUsuarioOtro}</p>}
        </div>
      )}
    </div>
  )
}

export default StepScope
