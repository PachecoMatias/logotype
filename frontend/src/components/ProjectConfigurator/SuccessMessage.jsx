import { motion } from 'framer-motion'
import { EASE_OUT, DURATION, SPRING } from '../../motion/tokens.js'

// The confirmation arrives as three beats: the seal lands, then the message,
// then the action.
const box = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }

const markIn = {
  hidden: { opacity: 0, scale: 0.7 },
  visible: { opacity: 1, scale: 1, transition: SPRING },
}

const lineIn = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.layout, ease: EASE_OUT } },
}

function SuccessMessage({ onRestart }) {
  return (
    <motion.div className="cfg-success" variants={box} initial="hidden" animate="visible">
      <motion.div className="cfg-success__mark" aria-hidden="true" variants={markIn}><span>✓</span></motion.div>

      <motion.h3 variants={lineIn}>¡Proyecto recibido!</motion.h3>
      <motion.p variants={lineIn}>
        Gracias por confiar en Logotype. Recibimos la información de tu proyecto y nuestro
        equipo analizará tus necesidades para preparar una propuesta personalizada.
      </motion.p>

      <motion.button
        className="cfg-button cfg-button--primary"
        onClick={onRestart}
        variants={lineIn}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
      >
        Cargar otro proyecto <span aria-hidden="true">→</span>
      </motion.button>
    </motion.div>
  )
}

export default SuccessMessage
