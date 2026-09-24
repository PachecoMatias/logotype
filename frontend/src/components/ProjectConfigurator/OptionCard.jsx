import { motion } from 'framer-motion'

/**
 * Selectable card used across configurator steps (single or multi select).
 */
function OptionCard({ icon, title, description, selected, onClick }) {
  return (
    <motion.button
      type="button"
      className={`option-card${selected ? ' selected' : ''}`}
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {icon && <span className="option-icon">{icon}</span>}
      <span>
        <span className="option-title">{title}</span>
        {description && <span className="option-desc" style={{ display: 'block' }}>{description}</span>}
      </span>
      <span className="option-check" aria-hidden="true" />
    </motion.button>
  )
}

export default OptionCard
