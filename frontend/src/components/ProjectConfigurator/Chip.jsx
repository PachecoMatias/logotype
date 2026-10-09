import { motion } from 'framer-motion'
import { EASE_OUT, DURATION } from '../../motion/tokens.js'
import { childVariants } from '../../motion/variants.js'

/**
 * Selectable chip that remains visible by default and only animates
 * interaction feedback.
 */
function Chip({ label, selected, onClick, index = 0 }) {
  return (
    <motion.button
      type="button"
      className={`cfg-chip${selected ? ' cfg-chip--selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
      variants={childVariants}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: DURATION.feedback, ease: EASE_OUT }}
    >
      <span aria-hidden="true">{selected ? '✓' : '+'}</span>{label}
    </motion.button>
  )
}

export default Chip
