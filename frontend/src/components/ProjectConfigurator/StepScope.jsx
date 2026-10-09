import { motion } from 'framer-motion'
import Chip from './Chip.jsx'
import { platforms, userRanges, yesNoUnsure, userTypes } from '../../data/projectOptions.js'
import RevealGroup from '../../motion/RevealGroup.jsx'
import { childVariants, fieldErrorMotion } from '../../motion/variants.js'

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
    <RevealGroup className="cfg-step" viewport={false} mount>
      <motion.h2 className="cfg-step__title" variants={childVariants}>Definamos algunas características</motion.h2>
      <motion.p className="cfg-step__intro" variants={childVariants}>Ubicá dónde se va a usar y quiénes van a participar para que podamos dimensionar el alcance.</motion.p>

      <motion.div className="cfg-field" variants={childVariants}>
        <label>
          Plataformas<span className="cfg-required">*</span>
        </label>
        <div className="cfg-chip-grid">
          {platforms.map((platform, index) => (
            <Chip
              key={platform}
              index={index}
              label={platform}
              selected={data.plataformas.includes(platform)}
              onClick={() => togglePlatform(platform)}
            />
          ))}
        </div>
        {errors.plataformas && <motion.p className="cfg-field-error" {...fieldErrorMotion}>{errors.plataformas}</motion.p>}
      </motion.div>

      <motion.div className="cfg-field" variants={childVariants}>
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
        {errors.cantidadUsuarios && <motion.p className="cfg-field-error" {...fieldErrorMotion}>{errors.cantidadUsuarios}</motion.p>}
      </motion.div>

      <motion.div className="cfg-field" variants={childVariants}>
        <label>
          ¿Necesitás diferentes tipos de usuarios?<span className="cfg-required">*</span>
        </label>
        <div className="cfg-chip-grid">
          {yesNoUnsure.map((option, index) => (
            <Chip
              key={option}
              index={index}
              label={option}
              selected={data.necesitaTiposUsuario === option}
              onClick={() => onChange({ ...data, necesitaTiposUsuario: option })}
            />
          ))}
        </div>
        {errors.necesitaTiposUsuario && <motion.p className="cfg-field-error" {...fieldErrorMotion}>{errors.necesitaTiposUsuario}</motion.p>}
      </motion.div>

      {data.necesitaTiposUsuario === 'Sí' && (
          <motion.div className="cfg-field" variants={childVariants}>
            <label>
              ¿Qué tipos de usuarios?<span className="cfg-required">*</span>
            </label>
            <div className="cfg-chip-grid">
              {userTypes.map((tipo, index) => (
                <Chip
                  key={tipo}
                  index={index}
                  label={tipo}
                  selected={data.tiposUsuario.includes(tipo)}
                  onClick={() => toggleTipoUsuario(tipo)}
                />
              ))}
            </div>
            {errors.tiposUsuario && <motion.p className="cfg-field-error" {...fieldErrorMotion}>{errors.tiposUsuario}</motion.p>}
          </motion.div>
      )}

      {data.tiposUsuario.includes('Otro') && (
          <motion.div className="cfg-field" variants={childVariants}>
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
            {errors.tiposUsuarioOtro && <motion.p className="cfg-field-error" {...fieldErrorMotion}>{errors.tiposUsuarioOtro}</motion.p>}
          </motion.div>
      )}
    </RevealGroup>
  )
}

export default StepScope
