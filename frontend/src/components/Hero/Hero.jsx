import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import Button from '../common/Button.jsx'
import { EASE_OUT, DURATION, CLIP_VISIBLE } from '../../motion/tokens.js'

// The hero is the authored set piece: the blueprint reticle draws first, the
// axis rises, then the wordmark, the blue planning panel and finally the
// actions assemble in order. Everything below is one choreographed sequence.
// Every `hidden` state resets instantly so leaving the viewport never replays a
// visible reverse animation.
const RESET = { duration: 0 }

const heroSeq = {
  hidden: { transition: RESET },
  visible: { transition: { delayChildren: 0.06, staggerChildren: 0.16 } },
}

const fieldIn = {
  hidden: { scale: 1.04, clipPath: 'inset(7% 7% 7% 7%)', transition: RESET },
  visible: {
    scale: 1,
    clipPath: CLIP_VISIBLE,
    transition: { duration: DURATION.construction, ease: EASE_OUT, delayChildren: 0.28, staggerChildren: 0.07 },
  },
}

const axisIn = {
  hidden: { scaleY: 0, transition: RESET },
  visible: { scaleY: 1, transition: { duration: DURATION.construction, ease: EASE_OUT } },
}

const frameSeq = {
  hidden: { transition: RESET },
  visible: { transition: { staggerChildren: 0.18, delayChildren: 0.08 } },
}

const wordmarkSeq = {
  hidden: { opacity: 0, transition: RESET },
  visible: { opacity: 1, transition: { duration: DURATION.focal, ease: EASE_OUT, staggerChildren: 0.11 } },
}

const wordIn = {
  hidden: { clipPath: 'inset(0% 0% 100% 0%)', y: 20, transition: RESET },
  visible: { clipPath: CLIP_VISIBLE, y: 0, transition: { duration: DURATION.construction, ease: EASE_OUT } },
}

const panelIn = {
  hidden: { clipPath: 'inset(0% 100% 0% 0%)', transition: RESET },
  visible: {
    clipPath: CLIP_VISIBLE,
    transition: { duration: DURATION.focal, ease: EASE_OUT, delayChildren: 0.3, staggerChildren: 0.09 },
  },
}

const textIn = {
  hidden: { opacity: 0, y: 14, transition: RESET },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.layout, ease: EASE_OUT } },
}

const actionsSeq = {
  hidden: { transition: RESET },
  visible: { transition: { staggerChildren: 0.08 } },
}

const actionIn = {
  hidden: { opacity: 0, y: 12, transition: RESET },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.state, ease: EASE_OUT } },
}

// SVG line drawing: paths are masked by their stroke length.
const drawIn = {
  hidden: { pathLength: 0, opacity: 0, transition: RESET },
  visible: { pathLength: 1, opacity: 1, transition: { duration: DURATION.construction, ease: EASE_OUT } },
}

const nodeIn = {
  hidden: { opacity: 0, transition: RESET },
  visible: { opacity: 1, transition: { duration: DURATION.state, ease: EASE_OUT } },
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
      whileInView="visible"
      viewport={{ once: false, amount: 0.05, margin: '0px 0px -64px 0px' }}
    >
      <motion.div
        className="site-hero__field"
        aria-hidden="true"
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
      </motion.div>

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
            <Button className="site-button site-button--primary" variants={actionIn} onClick={() => onNavigate('configurador')}>Contanos tu proyecto <span aria-hidden="true">↗</span></Button>
            <Button variant="line" className="site-button site-button--line" variants={actionIn} onClick={() => onNavigate('sistema')}>Ver prototipo</Button>
            <Button variant="line" className="site-button site-button--line" variants={actionIn} onClick={() => onNavigate('empresa')}>Conocer Logotype</Button>
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
