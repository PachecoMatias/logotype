import { AnimatePresence, motion } from 'framer-motion'
import Chip from './Chip.jsx'
import { platforms, userRanges, yesNoUnsure, userTypes } from '../../data/projectOptions.js'
import { stepContainer, stepField, EASE_OUT, DURATION } from '../../motion/tokens.js'

const followIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: DURATION.layout, ease: EASE_OUT },
}

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
    <motion.div className="cfg-step" variants={stepContainer} initial="hidden" animate="show">
      <motion.h2 className="cfg-step__title" variants={stepField}>Definamos algunas características</motion.h2>
      <motion.p className="cfg-step__intro" variants={stepField}>Ubicá dónde se va a usar y quiénes van a participar para que podamos dimensionar el alcance.</motion.p>

      <motion.div className="cfg-field" variants={stepField}>
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
        {errors.plataformas && <p className="cfg-field-error">{errors.plataformas}</p>}
      </motion.div>

      <motion.div className="cfg-field" variants={stepField}>
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
      </motion.div>

      <motion.div className="cfg-field" variants={stepField}>
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
        {errors.necesitaTiposUsuario && <p className="cfg-field-error">{errors.necesitaTiposUsuario}</p>}
      </motion.div>

      <AnimatePresence initial={false}>
        {data.necesitaTiposUsuario === 'Sí' && (
          <motion.div className="cfg-field" key="tiposUsuarioBlock" {...followIn}>
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
            {errors.tiposUsuario && <p className="cfg-field-error">{errors.tiposUsuario}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {data.tiposUsuario.includes('Otro') && (
          <motion.div className="cfg-field" key="tiposUsuarioOtro" {...followIn}>
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default StepScope
