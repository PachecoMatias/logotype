import { rubros } from '../../data/projectOptions.js'

function StepCompany({ data, errors, onChange }) {
  const set = (field) => (e) => onChange({ ...data, [field]: e.target.value })

  return (
    <div>
      <h3 className="step-title">Primero, conozcamos tu empresa</h3>
      <p className="step-subtitle">
        Necesitamos algunos datos básicos para entender el contexto de tu proyecto.
      </p>

      <div className="two-col">
        <div className="form-group">
          <label htmlFor="nombreEmpresa">
            Nombre de la empresa<span className="required">*</span>
          </label>
          <input
            id="nombreEmpresa"
            className="form-control"
            type="text"
            value={data.nombreEmpresa}
            onChange={set('nombreEmpresa')}
            placeholder="Ej: Comercio Norte"
          />
          {errors.nombreEmpresa && <p className="field-error">{errors.nombreEmpresa}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="contacto">
            Persona de contacto<span className="required">*</span>
          </label>
          <input
            id="contacto"
            className="form-control"
            type="text"
            value={data.contacto}
            onChange={set('contacto')}
            placeholder="Ej: Juan Pérez"
          />
          {errors.contacto && <p className="field-error">{errors.contacto}</p>}
        </div>
      </div>

      <div className="two-col">
        <div className="form-group">
          <label htmlFor="email">
            Email<span className="required">*</span>
          </label>
          <input
            id="email"
            className="form-control"
            type="email"
            value={data.email}
            onChange={set('email')}
            placeholder="nombre@empresa.com"
          />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="telefono">
            Teléfono<span className="required">*</span>
          </label>
          <input
            id="telefono"
            className="form-control"
            type="tel"
            value={data.telefono}
            onChange={set('telefono')}
            placeholder="Ej: 381 000 0000"
          />
          {errors.telefono && <p className="field-error">{errors.telefono}</p>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="rubro">
          Rubro<span className="required">*</span>
        </label>
        <select id="rubro" className="form-control" value={data.rubro} onChange={set('rubro')}>
          <option value="">Seleccioná una opción</option>
          {rubros.map((rubro) => (
            <option key={rubro} value={rubro}>
              {rubro}
            </option>
          ))}
        </select>
        {errors.rubro && <p className="field-error">{errors.rubro}</p>}
      </div>

      {data.rubro === 'Otro' && (
        <div className="form-group">
          <label htmlFor="rubroOtro">
            Contanos cuál<span className="required">*</span>
          </label>
          <input
            id="rubroOtro"
            className="form-control"
            type="text"
            value={data.rubroOtro}
            onChange={set('rubroOtro')}
            placeholder="Describí tu rubro"
          />
          {errors.rubroOtro && <p className="field-error">{errors.rubroOtro}</p>}
        </div>
      )}
    </div>
  )
}

export default StepCompany
