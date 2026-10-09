import { AnimatePresence, motion } from 'framer-motion'
import { rubros } from '../../data/projectOptions.js'
import { stepContainer, stepField, EASE_OUT, DURATION } from '../../motion/tokens.js'

const followIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: DURATION.layout, ease: EASE_OUT },
}

function StepCompany({ data, errors, onChange }) {
  const set = (field) => (e) => onChange({ ...data, [field]: e.target.value })

  return (
    <motion.div className="cfg-step" variants={stepContainer} initial="hidden" animate="show">
      <motion.h2 className="cfg-step__title" variants={stepField}>Primero, conozcamos tu empresa</motion.h2>
      <motion.p className="cfg-step__intro" variants={stepField}>
        Compartinos los datos básicos para ubicar el proyecto en el contexto real de tu organización.
      </motion.p>

      <motion.div className="cfg-field-grid" variants={stepField}>
        <div className="cfg-field">
          <label htmlFor="nombreEmpresa">
            Nombre de la empresa<span className="cfg-required">*</span>
          </label>
          <input
            id="nombreEmpresa"
            className="cfg-control"
            type="text"
            value={data.nombreEmpresa}
            onChange={set('nombreEmpresa')}
            placeholder="Ej: Comercio Norte"
          />
          {errors.nombreEmpresa && <p className="cfg-field-error">{errors.nombreEmpresa}</p>}
        </div>

        <div className="cfg-field">
          <label htmlFor="contacto">
            Persona de contacto<span className="cfg-required">*</span>
          </label>
          <input
            id="contacto"
            className="cfg-control"
            type="text"
            value={data.contacto}
            onChange={set('contacto')}
            placeholder="Ej: Juan Pérez"
          />
          {errors.contacto && <p className="cfg-field-error">{errors.contacto}</p>}
        </div>
      </motion.div>

      <motion.div className="cfg-field-grid" variants={stepField}>
        <div className="cfg-field">
          <label htmlFor="email">
            Email<span className="cfg-required">*</span>
          </label>
          <input
            id="email"
            className="cfg-control"
            type="email"
            value={data.email}
            onChange={set('email')}
            placeholder="nombre@empresa.com"
          />
          {errors.email && <p className="cfg-field-error">{errors.email}</p>}
        </div>

        <div className="cfg-field">
          <label htmlFor="telefono">
            Teléfono<span className="cfg-required">*</span>
          </label>
          <input
            id="telefono"
            className="cfg-control"
            type="tel"
            value={data.telefono}
            onChange={set('telefono')}
            placeholder="Ej: 381 000 0000"
          />
          {errors.telefono && <p className="cfg-field-error">{errors.telefono}</p>}
        </div>
      </motion.div>

      <motion.div className="cfg-field" variants={stepField}>
        <label htmlFor="rubro">
          Rubro<span className="cfg-required">*</span>
        </label>
        <select id="rubro" className="cfg-control" value={data.rubro} onChange={set('rubro')}>
          <option value="">Seleccioná una opción</option>
          {rubros.map((rubro) => (
            <option key={rubro} value={rubro}>
              {rubro}
            </option>
          ))}
        </select>
        {errors.rubro && <p className="cfg-field-error">{errors.rubro}</p>}
      </motion.div>

      <AnimatePresence initial={false}>
        {data.rubro === 'Otro' && (
          <motion.div className="cfg-field" key="rubroOtro" {...followIn}>
            <label htmlFor="rubroOtro">
              Contanos cuál<span className="cfg-required">*</span>
            </label>
            <input
              id="rubroOtro"
              className="cfg-control"
              type="text"
              value={data.rubroOtro}
              onChange={set('rubroOtro')}
              placeholder="Describí tu rubro"
            />
            {errors.rubroOtro && <p className="cfg-field-error">{errors.rubroOtro}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default StepCompany
