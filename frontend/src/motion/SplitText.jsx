import { motion } from 'framer-motion'
import { childVariants } from './variants.js'

/**
 * Renders an accessible title as stable, always-visible words. Legacy motion
 * options remain accepted by callers but no longer affect presentation.
 */
function SplitText({
  text,
  as = 'h2',
  className,
}) {
  const Component = motion[as] || motion.h2
  const value = String(text)

  return (
    <Component
      className={`split-text${className ? ` ${className}` : ''}`}
      aria-label={value}
      variants={childVariants}
    >
      <span aria-hidden="true">{value}</span>
    </Component>
  )
}

export default SplitText
