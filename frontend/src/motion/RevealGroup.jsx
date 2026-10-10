import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { parentVariants } from './variants.js'

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
  const ref = useRef(null)
  
  // Hook one-shot
  const isInView = useInView(ref, { once: true, amount: 0.1 })

  const variants = {
    ...parentVariants,
    visible: { transition: { staggerChildren: stagger, delayChildren } },
  }

  // Determinamos si debe verse por scroll o por montaje inicial
  const shouldAnimate = mount || (viewport && isInView)

  return (
    <Component
      ref={ref}
      className={className}
      variants={variants}
      initial="hidden"
      animate={shouldAnimate ? 'visible' : 'hidden'}
      {...rest}
    >
      {children}
    </Component>
  )
}

export default RevealGroup