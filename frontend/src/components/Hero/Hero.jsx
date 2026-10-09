import { motion, useScroll, useTransform } from 'framer-motion'
import Button from '../common/Button.jsx'

function Hero({ onNavigate }) {
  const { scrollYProgress } = useScroll()
  const axisY = useTransform(scrollYProgress, [0, 0.22], [0, 110])

  return (
    <section className="site-hero" id="inicio">
      <div className="site-hero__field" aria-hidden="true">
        <svg className="site-hero__diagram" viewBox="0 0 640 420" fill="none" focusable="false" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="1">
            <path d="M64 344 H232 V250 H408" />
            <path d="M232 250 V128 H488" />
            <path d="M408 250 V64 H568" />
            <path d="M488 128 V344 H568" />
          </g>
          <g fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="64" cy="344" r="6" />
            <rect x="226" y="244" width="12" height="12" />
            <circle cx="408" cy="250" r="6" />
            <rect x="482" y="122" width="12" height="12" />
            <circle cx="568" cy="344" r="6" />
            <rect x="562" y="58" width="12" height="12" />
          </g>
          <circle cx="232" cy="128" r="3" fill="currentColor" />
          <circle className="site-hero__diagram-node" cx="408" cy="250" r="4" />
        </svg>
      </div>
      <motion.div className="site-hero__axis" style={{ y: axisY }} aria-hidden="true" />
      <div className="site-shell site-hero__frame">
        <motion.h1
          className="site-hero__wordmark"
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span>LOGO</span><span>TYPE</span>
        </motion.h1>
        <motion.div
          className="site-hero__statement"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.18 }}
        >
          <p className="site-hero__lead">Soluciones digitales para un mundo conectado.</p>
          <p className="site-hero__copy">
            Somos Logotype, una empresa de desarrollo de software enfocada en crear
            soluciones tecnológicas innovadoras para empresas y comercios. Contanos tu
            proyecto y te ayudamos a construir la solución a medida que necesitás.
          </p>
          <div className="site-hero__actions">
            <Button className="site-button site-button--primary" onClick={() => onNavigate('configurador')}>Contanos tu proyecto <span aria-hidden="true">↗</span></Button>
            <Button variant="line" className="site-button site-button--line" onClick={() => onNavigate('sistema')}>Ver prototipo</Button>
            <Button variant="line" className="site-button site-button--line" onClick={() => onNavigate('empresa')}>Conocer Logotype</Button>
          </div>
        </motion.div>
        <div className="site-hero__registration" aria-hidden="true">
          <span>R</span><span>G</span><span>B</span>
        </div>
      </div>
    </section>
  )
}

export default Hero
