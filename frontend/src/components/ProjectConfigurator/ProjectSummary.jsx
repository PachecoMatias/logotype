import { motion } from 'framer-motion'
import { projectTypes } from '../../data/projectOptions.js'
import { EASE_OUT, DURATION } from '../../motion/tokens.js'
import RevealGroup from '../../motion/RevealGroup.jsx'
import { childVariants } from '../../motion/variants.js'

// The summary is built like a document being assembled: each section is a
// block that settles in order, and each edit affordance reacts on hover.
const editMotion = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { duration: DURATION.feedback, ease: EASE_OUT },
}

function ProjectSummary({ projectData, onEditStep }) {
  const { empresa, proyecto, problema, funcionalidades, alcance, presupuesto } = projectData

  const tipoProyecto = projectTypes.find((t) => t.id === proyecto.tipoProyecto)

  return (
    <RevealGroup className="cfg-step cfg-summary" viewport={false} mount>
      <motion.h2 className="cfg-step__title" variants={childVariants}>Revisá tu proyecto</motion.h2>
      <motion.p className="cfg-step__intro" variants={childVariants}>
        Verificá que la información sea correcta antes de enviar tu solicitud. Podés volver a
        cualquier sección para modificarla.
      </motion.p>

      <motion.div className="cfg-summary__registry" variants={childVariants}>
        <motion.section className="cfg-summary__section" variants={childVariants}>
          <div className="cfg-summary__header">
            <h3>Empresa</h3>
            <motion.button className="cfg-summary__edit" onClick={() => onEditStep(0)} {...editMotion}>
              Editar <span aria-hidden="true">↗</span>
            </motion.button>
          </div>
          <dl className="cfg-summary__rows">
            <div><dt>Empresa</dt><dd>{empresa.nombreEmpresa}</dd></div>
            <div><dt>Contacto</dt><dd>{empresa.contacto}</dd></div>
            <div><dt>Email</dt><dd>{empresa.email}</dd></div>
            <div><dt>Teléfono</dt><dd>{empresa.telefono}</dd></div>
            <div><dt>Rubro</dt><dd>{empresa.rubro === 'Otro' ? empresa.rubroOtro : empresa.rubro}</dd></div>
          </dl>
        </motion.section>

        <motion.section className="cfg-summary__section" variants={childVariants}>
          <div className="cfg-summary__header">
            <h3>Proyecto</h3>
            <motion.button className="cfg-summary__edit" onClick={() => onEditStep(1)} {...editMotion}>
              Editar <span aria-hidden="true">↗</span>
            </motion.button>
          </div>
          <dl className="cfg-summary__rows">
            <div><dt>Tipo de solución</dt><dd>{tipoProyecto?.title}</dd></div>
          </dl>
        </motion.section>

        <motion.section className="cfg-summary__section cfg-summary__section--wide" variants={childVariants}>
          <div className="cfg-summary__header">
            <h3>Problema</h3>
            <motion.button className="cfg-summary__edit" onClick={() => onEditStep(2)} {...editMotion}>
              Editar <span aria-hidden="true">↗</span>
            </motion.button>
          </div>
          <dl className="cfg-summary__rows">
            <div><dt>Problema actual</dt><dd>{problema.problemaActual}</dd></div>
            <div><dt>Proceso actual</dt><dd>{problema.procesoActual}</dd></div>
            <div className="cfg-summary__row--stacked"><dt>Objetivos</dt><dd className="cfg-summary__tags">
                {problema.objetivos.map((obj) => (
                  <span key={obj}>{obj === 'Otro' ? problema.objetivosOtro || 'Otro' : obj}</span>
                ))}
            </dd></div>
          </dl>
        </motion.section>

        <motion.section className="cfg-summary__section cfg-summary__section--wide" variants={childVariants}>
          <div className="cfg-summary__header">
            <h3>Funcionalidades</h3>
            <motion.button className="cfg-summary__edit" onClick={() => onEditStep(3)} {...editMotion}>
              Editar <span aria-hidden="true">↗</span>
            </motion.button>
          </div>
          <div className="cfg-summary__tags">
            {funcionalidades.seleccionadas.map((feature) => (
              <span key={feature}>{feature === 'Otra' ? funcionalidades.otra || 'Otra' : feature}</span>
            ))}
          </div>
        </motion.section>

        <motion.section className="cfg-summary__section" variants={childVariants}>
          <div className="cfg-summary__header">
            <h3>Alcance</h3>
            <motion.button className="cfg-summary__edit" onClick={() => onEditStep(4)} {...editMotion}>
              Editar <span aria-hidden="true">↗</span>
            </motion.button>
          </div>
          <dl className="cfg-summary__rows">
            <div><dt>Plataformas</dt><dd>{alcance.plataformas.join(', ')}</dd></div>
            <div><dt>Cantidad de usuarios</dt><dd>{alcance.cantidadUsuarios}</dd></div>
            <div><dt>¿Requiere tipos de usuario?</dt><dd>{alcance.necesitaTiposUsuario}</dd></div>
            {alcance.necesitaTiposUsuario === 'Sí' && (
              <div><dt>Tipos de usuarios</dt><dd>{alcance.tiposUsuario
                .map((type) => (type === 'Otro' ? alcance.tiposUsuarioOtro || 'Otro' : type))
                .join(', ')}</dd></div>
            )}
          </dl>
        </motion.section>

        <motion.section className="cfg-summary__section" variants={childVariants}>
          <div className="cfg-summary__header">
            <h3>Planificación</h3>
            <motion.button className="cfg-summary__edit" onClick={() => onEditStep(5)} {...editMotion}>
              Editar <span aria-hidden="true">↗</span>
            </motion.button>
          </div>
          <dl className="cfg-summary__rows">
            <div><dt>Presupuesto</dt><dd>{presupuesto.presupuesto}</dd></div>
            <div><dt>Plazo</dt><dd>{presupuesto.plazo}</dd></div>
            {presupuesto.infoAdicional && <div><dt>Información adicional</dt><dd>{presupuesto.infoAdicional}</dd></div>}
          </dl>
        </motion.section>
      </motion.div>
    </RevealGroup>
  )
}

export default ProjectSummary
