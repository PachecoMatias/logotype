import { motion } from 'framer-motion'

const directions = {
  up: { y: 40, x: 0 },
  left: { y: 0, x: -40 },
  right: { y: 0, x: 40 },
  fade: { y: 0, x: 0 },
}

/**
 * Wraps a section's content to animate it into view on scroll.
 * direction: 'up' | 'left' | 'right' | 'fade'
 */
function AnimatedSection({ children, direction = 'up', delay = 0, className = '', as = 'div' }) {
  const offset = directions[direction] || directions.up
  const Component = motion[as] || motion.div

  return (
    <Component
      className={className}
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </Component>
  )
}

export default AnimatedSection
