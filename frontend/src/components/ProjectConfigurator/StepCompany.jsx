import { rubros } from '../../data/projectOptions.js'

function StepCompany({ data, errors, onChange }) {
  const set = (field) => (e) => onChange({ ...data, [field]: e.target.value })

  return (
    <div className="cfg-step">
      <h2 className="cfg-step__title">Primero, conozcamos tu empresa</h2>
      <p className="cfg-step__intro">
        Compartinos los datos básicos para ubicar el proyecto en el contexto real de tu organización.
      </p>

      <div className="cfg-field-grid">
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
      </div>

      <div className="cfg-field-grid">
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
      </div>

      <div className="cfg-field">
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
      </div>

      {data.rubro === 'Otro' && (
        <div className="cfg-field">
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
        </div>
      )}
    </div>
  )
}

export default StepCompany
