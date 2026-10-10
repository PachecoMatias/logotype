import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import Button from '../common/Button.jsx'
import Parallax from '../../motion/Parallax.jsx'
import { MOTION_DURATION, MOTION_EASE } from '../../motion/variants.js'

const heroSeq = {
  hidden: {},
  visible: { transition: { delayChildren: 0.04, staggerChildren: 0.14 } },
}

const fieldIn = {
  hidden: { opacity: 0, scale: 1.04 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: MOTION_DURATION.slow, ease: MOTION_EASE, delayChildren: 0.28, staggerChildren: 0.07 },
  },
}

const axisIn = {
  hidden: { scaleY: 0 },
  visible: { scaleY: 1, transition: { duration: MOTION_DURATION.slow, ease: MOTION_EASE } },
}

const frameSeq = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18, delayChildren: 0.08 } },
}

// 1. HACEMOS EL TÍTULO MÁS LENTO:
// Aumentamos el staggerChildren (ej: 0.4) para que tarde más en aparecer la segunda palabra
const wordmarkSeq = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { duration: 0.8, ease: MOTION_EASE, staggerChildren: 0.2 } 
  },
}

// Aumentamos la duración individual de cada palabra (ej: 1.5 segundos)
const wordIn = {
  hidden: { opacity: 0, y: 24 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 1.5, ease: MOTION_EASE } 
  },
}

const panelIn = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: MOTION_DURATION.base, ease: MOTION_EASE, delayChildren: 0.3, staggerChildren: 0.09 },
  },
}

const textIn = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: MOTION_DURATION.base, ease: MOTION_EASE } },
}

const actionsSeq = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const actionIn = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: MOTION_DURATION.quick, ease: MOTION_EASE } },
}

const drawIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: MOTION_DURATION.slow, ease: MOTION_EASE } },
}

const nodeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: MOTION_DURATION.quick, ease: MOTION_EASE } },
}

function Hero({ onNavigate }) {
  const heroRef = useRef(null)
  const shouldReduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const axisY = useTransform(scrollYProgress, [0, 0.22], [0, 110])
  const fieldOpacity = useTransform(scrollYProgress, [0, 1], [0.6, 0.26])

  return (
    <motion.section
      ref={heroRef}
      className="site-hero"
      id="inicio"
      variants={heroSeq}
      initial="hidden"
      // 2. ACTIVACIÓN POR SCROLL REPETITIVA:
      // Reemplazamos animate="visible" por whileInView y viewport
      whileInView="visible"
      viewport={{ once: false, amount: 0.2 }}
    >
      <Parallax
        className="site-hero__field"
        aria-hidden="true"
        distance={40}
        style={{ opacity: shouldReduceMotion ? 0.6 : fieldOpacity }}
        variants={fieldIn}
      >
        <svg className="site-hero__diagram" viewBox="0 0 640 420" fill="none" focusable="false" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="1">
            <motion.path d="M64 344 H232 V250 H408" variants={drawIn} />
            <motion.path d="M232 250 V128 H488" variants={drawIn} />
            <motion.path d="M408 250 V64 H568" variants={drawIn} />
            <motion.path d="M488 128 V344 H568" variants={drawIn} />
          </g>
          <g fill="none" stroke="currentColor" strokeWidth="1.5">
            <motion.circle cx="64" cy="344" r="6" variants={nodeIn} />
            <motion.rect x="226" y="244" width="12" height="12" variants={nodeIn} />
            <motion.circle cx="408" cy="250" r="6" variants={nodeIn} />
            <motion.rect x="482" y="122" width="12" height="12" variants={nodeIn} />
            <motion.circle cx="568" cy="344" r="6" variants={nodeIn} />
            <motion.rect x="562" y="58" width="12" height="12" variants={nodeIn} />
          </g>
          <motion.circle cx="232" cy="128" r="3" fill="currentColor" variants={nodeIn} />
          <motion.circle className="site-hero__diagram-node" cx="408" cy="250" r="4" variants={nodeIn} />
        </svg>
      </Parallax>

      <motion.div
        className="site-hero__axis"
        aria-hidden="true"
        style={{ y: shouldReduceMotion ? 0 : axisY, transformOrigin: 'top' }}
        variants={axisIn}
      />

      <motion.div className="site-shell site-hero__frame" variants={frameSeq}>
        <motion.h1 className="site-hero__wordmark" variants={wordmarkSeq}>
          <motion.span variants={wordIn}>LOGO</motion.span>
          <motion.span variants={wordIn}>TYPE</motion.span>
        </motion.h1>

        <motion.div className="site-hero__statement" variants={panelIn}>
          <motion.p className="site-hero__lead" variants={textIn}>Soluciones digitales para un mundo conectado.</motion.p>
          <motion.p className="site-hero__copy" variants={textIn}>
            Somos Logotype, una empresa de desarrollo de software enfocada en crear
            soluciones tecnológicas innovadoras para empresas y comercios. Contanos tu
            proyecto y te ayudamos a construir la solución a medida que necesitás.
          </motion.p>
          <motion.div className="site-hero__actions" variants={actionsSeq}>
            <Button className="site-button site-button--primary" variants={actionIn} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => onNavigate('configurador')}>Contanos tu proyecto <span aria-hidden="true">↗</span></Button>
            <Button variant="line" className="site-button site-button--line" variants={actionIn} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => onNavigate('sistema')}>Ver prototipo</Button>
            <Button variant="line" className="site-button site-button--line" variants={actionIn} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => onNavigate('empresa')}>Conocer Logotype</Button>
          </motion.div>
        </motion.div>

        <motion.div className="site-hero__registration" aria-hidden="true" variants={textIn}>
          <span>R</span><span>G</span><span>B</span>
        </motion.div>
      </motion.div>
    </motion.section>
  )
}

export default Hero