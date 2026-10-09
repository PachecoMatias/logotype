import { motion } from 'framer-motion'
import { parentVariants, VIEWPORT_ONCE } from './variants.js'

function SectionReveal({ as = 'section', children, className, ...rest }) {
  const Component = motion[as] || motion.section

  return (
    <Component
      className={className}
      variants={parentVariants}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      {...rest}
    >
      {children}
    </Component>
  )
}

export default SectionReveal
