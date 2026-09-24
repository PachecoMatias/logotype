import { projectTypes } from '../../data/projectOptions.js'

function ProjectSummary({ projectData, onEditStep }) {
  const { empresa, proyecto, problema, funcionalidades, alcance, presupuesto } = projectData

  const tipoProyecto = projectTypes.find((t) => t.id === proyecto.tipoProyecto)

  return (
    <div>
      <h3 className="step-title">Revisá tu proyecto</h3>
      <p className="step-subtitle">
        Verificá que la información sea correcta antes de enviar tu solicitud. Podés volver a
        cualquier sección para modificarla.
      </p>

      <div className="summary-card">
        <div className="summary-card-header">
          <h3>Empresa</h3>
          <button className="summary-edit-link" onClick={() => onEditStep(0)}>
            Editar
          </button>
        </div>
        <div className="summary-row">
          <span>Empresa</span>
          <span>{empresa.nombreEmpresa}</span>
        </div>
        <div className="summary-row">
          <span>Contacto</span>
          <span>{empresa.contacto}</span>
        </div>
        <div className="summary-row">
          <span>Email</span>
          <span>{empresa.email}</span>
        </div>
        <div className="summary-row">
          <span>Teléfono</span>
          <span>{empresa.telefono}</span>
        </div>
        <div className="summary-row">
          <span>Rubro</span>
          <span>{empresa.rubro === 'Otro' ? empresa.rubroOtro : empresa.rubro}</span>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-card-header">
          <h3>Solución</h3>
          <button className="summary-edit-link" onClick={() => onEditStep(1)}>
            Editar
          </button>
        </div>
        <div className="summary-row">
          <span>Tipo de proyecto</span>
          <span>{tipoProyecto?.title}</span>
        </div>
        <div className="summary-row">
          <span>Problema identificado</span>
          <span>{problema.problemaActual}</span>
        </div>
        <div className="summary-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <span>Objetivos</span>
          <div className="summary-tags" style={{ marginTop: 8 }}>
            {problema.objetivos.map((obj) => (
              <span className="summary-tag" key={obj}>
                {obj === 'Otro' ? problema.objetivosOtro || 'Otro' : obj}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-card-header">
          <h3>Funcionalidades</h3>
          <button className="summary-edit-link" onClick={() => onEditStep(3)}>
            Editar
          </button>
        </div>
        <div className="summary-tags">
          {funcionalidades.seleccionadas.map((f) => (
            <span className="summary-tag" key={f}>
              {f === 'Otra' ? funcionalidades.otra || 'Otra' : f}
            </span>
          ))}
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-card-header">
          <h3>Alcance</h3>
          <button className="summary-edit-link" onClick={() => onEditStep(4)}>
            Editar
          </button>
        </div>
        <div className="summary-row">
          <span>Plataformas</span>
          <span>{alcance.plataformas.join(', ')}</span>
        </div>
        <div className="summary-row">
          <span>Cantidad de usuarios</span>
          <span>{alcance.cantidadUsuarios}</span>
        </div>
        <div className="summary-row">
          <span>Tipos de usuarios</span>
          <span>
            {alcance.necesitaTiposUsuario === 'Sí'
              ? alcance.tiposUsuario
                  .map((t) => (t === 'Otro' ? alcance.tiposUsuarioOtro || 'Otro' : t))
                  .join(', ')
              : alcance.necesitaTiposUsuario}
          </span>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-card-header">
          <h3>Planificación</h3>
          <button className="summary-edit-link" onClick={() => onEditStep(5)}>
            Editar
          </button>
        </div>
        <div className="summary-row">
          <span>Presupuesto</span>
          <span>{presupuesto.presupuesto}</span>
        </div>
        <div className="summary-row">
          <span>Plazo</span>
          <span>{presupuesto.plazo}</span>
        </div>
        {presupuesto.infoAdicional && (
          <div className="summary-row">
            <span>Información adicional</span>
            <span>{presupuesto.infoAdicional}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectSummary
