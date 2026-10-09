import { motion } from 'framer-motion'
import { parentVariants, VIEWPORT_ONCE } from './variants.js'

function RevealGroup({
  as = 'div',
  children,
  className,
  stagger = 0.1,
  delayChildren = 0.08,
  viewport = true,
  mount = false,
  ...rest
}) {
  const Component = motion[as] || motion.div
  const variants = {
    ...parentVariants,
    visible: { transition: { staggerChildren: stagger, delayChildren } },
  }

  return (
    <Component
      className={className}
      variants={variants}
      initial={viewport || mount ? 'hidden' : undefined}
      whileInView={viewport ? 'visible' : undefined}
      animate={!viewport && mount ? 'visible' : undefined}
      viewport={viewport ? VIEWPORT_ONCE : undefined}
      {...rest}
    >
      {children}
    </Component>
  )
}

export default RevealGroup
