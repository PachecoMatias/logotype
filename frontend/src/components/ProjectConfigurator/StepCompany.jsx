import { motion } from 'framer-motion'
import { rubros } from '../../data/projectOptions.js'
import RevealGroup from '../../motion/RevealGroup.jsx'
import { childVariants, fieldErrorMotion } from '../../motion/variants.js'

function StepCompany({ data, errors, onChange }) {
  const set = (field) => (e) => onChange({ ...data, [field]: e.target.value })

  return (
    <RevealGroup className="cfg-step" viewport={false} mount>
      <motion.h2 className="cfg-step__title" variants={childVariants}>Primero, conozcamos tu empresa</motion.h2>
      <motion.p className="cfg-step__intro" variants={childVariants}>
        Compartinos los datos básicos para ubicar el proyecto en el contexto real de tu organización.
      </motion.p>

      <motion.div className="cfg-field-grid" variants={childVariants}>
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
          {errors.nombreEmpresa && <motion.p className="cfg-field-error" {...fieldErrorMotion}>{errors.nombreEmpresa}</motion.p>}
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
          {errors.contacto && <motion.p className="cfg-field-error" {...fieldErrorMotion}>{errors.contacto}</motion.p>}
        </div>
      </motion.div>

      <motion.div className="cfg-field-grid" variants={childVariants}>
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
          {errors.email && <motion.p className="cfg-field-error" {...fieldErrorMotion}>{errors.email}</motion.p>}
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
          {errors.telefono && <motion.p className="cfg-field-error" {...fieldErrorMotion}>{errors.telefono}</motion.p>}
        </div>
      </motion.div>

      <motion.div className="cfg-field" variants={childVariants}>
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
        {errors.rubro && <motion.p className="cfg-field-error" {...fieldErrorMotion}>{errors.rubro}</motion.p>}
      </motion.div>

      {data.rubro === 'Otro' && (
          <motion.div className="cfg-field" variants={childVariants}>
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
            {errors.rubroOtro && <motion.p className="cfg-field-error" {...fieldErrorMotion}>{errors.rubroOtro}</motion.p>}
          </motion.div>
      )}
    </RevealGroup>
  )
}

export default StepCompany
