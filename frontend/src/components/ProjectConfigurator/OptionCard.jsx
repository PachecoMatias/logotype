import { motion } from 'framer-motion'

/**
 * Selectable card used across configurator steps (single or multi select).
 */
function OptionCard({ icon, title, description, selected, onClick, index }) {
  return (
    <motion.button
      type="button"
      className={`cfg-option${selected ? ' cfg-option--selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18 }}
    >
      <span className="cfg-option__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      <span className="cfg-option__copy">
        <span className="cfg-option__title">{title}</span>
        {description && <span className="cfg-option__description">{description}</span>}
      </span>
      <span className="cfg-option__state" aria-hidden="true">{selected ? '✓' : '＋'}</span>
    </motion.button>
  )
}

export default OptionCard
