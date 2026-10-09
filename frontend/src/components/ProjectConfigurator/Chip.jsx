import { motion } from 'framer-motion'
import { EASE_OUT, DURATION } from '../../motion/tokens.js'

/**
 * Selectable chip. Visibility is driven by its own mount animation (object
 * states), never by a parent variant label, so a chip is always shown on the
 * first render regardless of hover or viewport state.
 */
function Chip({ label, selected, onClick, index = 0 }) {
  return (
    <motion.button
      type="button"
      className={`cfg-chip${selected ? ' cfg-chip--selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.state, ease: EASE_OUT, delay: index * 0.03 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
    >
      <span aria-hidden="true">{selected ? '✓' : '+'}</span>{label}
    </motion.button>
  )
}

export default Chip
