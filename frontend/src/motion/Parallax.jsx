import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

function Parallax({ as = 'div', children, distance = 40, style, ...rest }) {
  const ref = useRef(null)
  const reduceMotion = useReducedMotion()
  const boundedDistance = Math.min(40, Math.abs(distance))
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [-boundedDistance, boundedDistance])
  const Component = motion[as] || motion.div

  return (
    <Component ref={ref} style={{ ...style, y: reduceMotion ? 0 : y }} {...rest}>
      {children}
    </Component>
  )
}

export default Parallax
