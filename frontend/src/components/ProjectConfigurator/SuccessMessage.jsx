import { useReducedMotion } from 'framer-motion'
import { EASE_OUT, DURATION } from '../../motion/tokens.js'

function SuccessMessage({ onRestart }) {
  const reduceMotion = useReducedMotion()

  return (
    <div
      className="cfg-success"
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
    >
      <div className="cfg-success__mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" focusable="false">
          <path
            d="M12 25.5 20.5 34 37 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="square"
            strokeLinejoin="miter"
            initial={{ pathLength: reduceMotion ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT, delay: reduceMotion ? 0 : 0.18 }}
          />
        </svg>
      </div>

      <h3>¡Proyecto recibido!</h3>
      <p>
        Gracias por confiar en Logotype. Recibimos la información de tu proyecto y nuestro
        equipo analizará tus necesidades para preparar una propuesta personalizada.
      </p>

      <button
        className="cfg-button cfg-button--primary"
        onClick={onRestart}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: DURATION.feedback, ease: EASE_OUT }}
      >
        Cargar otro proyecto <span aria-hidden="true">→</span>
      </button>
    </div>
  )
}

export default SuccessMessage
