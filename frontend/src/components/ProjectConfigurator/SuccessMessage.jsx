import { motion } from 'framer-motion'

function SuccessMessage({ onRestart }) {
  return (
    <motion.div
      className="cfg-success"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="cfg-success__mark" aria-hidden="true"><span>✓</span></div>

      <h3>¡Proyecto recibido!</h3>
      <p>
        Gracias por confiar en Logotype. Recibimos la información de tu proyecto y nuestro
        equipo analizará tus necesidades para preparar una propuesta personalizada.
      </p>

      <motion.button
        className="cfg-button cfg-button--primary"
        onClick={onRestart}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
      >
        Cargar otro proyecto <span aria-hidden="true">→</span>
      </motion.button>
    </motion.div>
  )
}

export default SuccessMessage
