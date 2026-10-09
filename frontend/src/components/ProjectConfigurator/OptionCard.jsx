import { motion } from 'framer-motion'
import { EASE_OUT, DURATION } from '../../motion/tokens.js'

/**
 * Selectable card used across configurator steps (single or multi select).
 * Visibility is driven by its own mount animation (object states), never by a
 * parent variant label, so a card is always shown on the first render.
 */
function OptionCard({ icon, title, description, selected, onClick, index = 0 }) {
  return (
    <motion.button
      type="button"
      className={`cfg-option${selected ? ' cfg-option--selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.state, ease: EASE_OUT, delay: index * 0.04 }}
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.98 }}
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
