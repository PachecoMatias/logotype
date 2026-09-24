import { motion } from 'framer-motion'

function SuccessMessage({ onRestart }) {
  return (
    <motion.div
      className="success-screen"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <motion.div
        className="success-icon"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.15, type: 'spring', stiffness: 200 }}
      >
        ✓
      </motion.div>

      <h3>¡Proyecto recibido!</h3>
      <p>
        Gracias por confiar en Logotype. Recibimos la información de tu proyecto y nuestro
        equipo analizará tus necesidades para preparar una propuesta personalizada.
      </p>

      <button className="btn btn-primary" onClick={onRestart}>
        Volver al inicio
      </button>
    </motion.div>
  )
}

export default SuccessMessage
