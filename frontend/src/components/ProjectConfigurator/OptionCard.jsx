import { motion } from 'framer-motion'
import { EASE_OUT, DURATION } from '../../motion/tokens.js'
import { childVariants } from '../../motion/variants.js'

/**
 * Selectable card used across configurator steps (single or multi select).
 * Options remain visible by default and only animate interaction feedback.
 */
function OptionCard({ icon, title, description, selected, onClick, index = 0 }) {
  return (
    <motion.button
      type="button"
      className={`cfg-option${selected ? ' cfg-option--selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
      variants={childVariants}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: DURATION.feedback, ease: EASE_OUT }}
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
