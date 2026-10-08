import { motion } from 'framer-motion'

function Chip({ label, selected, onClick }) {
  return (
    <motion.button
      type="button"
      className={`cfg-chip${selected ? ' cfg-chip--selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
    >
      <span aria-hidden="true">{selected ? '✓' : '+'}</span>{label}
    </motion.button>
  )
}

export default Chip
