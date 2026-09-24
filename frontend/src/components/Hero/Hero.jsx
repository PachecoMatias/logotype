import { motion } from 'framer-motion'

function Hero({ onNavigate }) {
  return (
    <section className="hero" id="inicio">
      <div className="container">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <h1>
            Soluciones digitales para un mundo <span>conectado.</span>
          </h1>

          <p>
            Somos Logotype, una empresa de desarrollo de software enfocada en crear
            soluciones tecnológicas innovadoras para empresas y comercios. Contanos tu
            proyecto y te ayudamos a construir la solución a medida que necesitás.
          </p>

          <div className="buttons">
            <button className="btn btn-primary" onClick={() => onNavigate('configurador')}>
              Contanos tu proyecto
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('sistema')}>
              Ver prototipo
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('empresa')}>
              Conocer Logotype
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Hero
