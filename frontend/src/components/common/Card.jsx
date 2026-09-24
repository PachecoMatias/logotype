import { motion } from 'framer-motion'

function Card({ icon, title, description, className = '' }) {
  return (
    <motion.div
      className={`card ${className}`}
      whileHover={{ y: -6, boxShadow: '0 14px 32px rgba(0,0,0,0.1)' }}
      transition={{ duration: 0.25 }}
    >
      {icon && <div className="icon">{icon}</div>}
      <h3>{title}</h3>
      <p>{description}</p>
    </motion.div>
  )
}

export default Card
