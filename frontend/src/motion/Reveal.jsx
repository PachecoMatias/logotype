import { motion } from 'framer-motion'
import { EASE_OUT, DURATION, VIEW, CLIP_VISIBLE, clipHidden } from './tokens.js'

// Reveal modes that move a single axis.
const AXIS = {
  rise: (d) => ({ y: d }),
  drop: (d) => ({ y: -d }),
  left: (d) => ({ x: -d }),
  right: (d) => ({ x: d }),
  fade: () => ({}),
  scale: () => ({ scale: 0.965 }),
}

// Reveal modes that grow a clip edge.
const CLIP_SIDE = {
  clipTop: 'top',
  clipBottom: 'bottom',
  clipLeft: 'left',
  clipRight: 'right',
}

// Reveal modes that draw a line by scaling its axis.
const DRAW = {
  drawX: 'scaleX',
  drawY: 'scaleY',
}

export function revealVariants(mode = 'rise', { distance = 26, duration, delay = 0 } = {}) {
  // `duration: 0` on the hidden state makes the leave reset instant: scrolling
  // an element out of view snaps it back without a visible reverse animation.
  // That reverse replay was the perceived flicker. The enter transition stays
  // authored on the `visible` state, which Framer uses as the target.
  const hidden = { opacity: 0, transition: { duration: 0 } }
  const visible = {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    transition: { duration: duration ?? DURATION.layout, delay, ease: EASE_OUT },
  }

  if (CLIP_SIDE[mode]) {
    hidden.clipPath = clipHidden(CLIP_SIDE[mode])
    visible.clipPath = CLIP_VISIBLE
  } else if (DRAW[mode]) {
    hidden[DRAW[mode]] = 0
  } else {
    Object.assign(hidden, (AXIS[mode] || AXIS.rise)(distance))
  }

  return { hidden, visible }
}

/**
 * Scroll reveal wrapper. `mode` picks the motion personality.
 */
export function Reveal({
  as = 'div',
  mode = 'rise',
  distance = 26,
  delay = 0,
  duration,
  amount,
  once = false,
  className,
  style,
  children,
  ...rest
}) {
  const Component = motion[as] || motion.div
  // Object-based states (not variant labels) so visibility never depends on
  // variant-label propagation, and a missed trigger cannot leave content hidden.
  const { hidden, visible } = revealVariants(mode, { distance, duration, delay })

  return (
    <Component
      className={className}
      style={style}
      initial={hidden}
      whileInView={visible}
      viewport={{ once, amount: amount ?? VIEW.amount, margin: VIEW.margin }}
      {...rest}
    >
      {children}
    </Component>
  )
}

/**
 * Parent that staggers its `StaggerItem` children when it enters the viewport.
 */
export function Stagger({
  as = 'div',
  stagger = 0.08,
  delayChildren = 0,
  amount,
  once = false,
  className,
  style,
  children,
  ...rest
}) {
  const Component = motion[as] || motion.div

  return (
    <Component
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: amount ?? VIEW.amount, margin: VIEW.margin }}
      variants={{ hidden: { transition: { duration: 0 } }, visible: { transition: { staggerChildren: stagger, delayChildren } } }}
      {...rest}
    >
      {children}
    </Component>
  )
}

/**
 * Child of `Stagger`. Inherits the parent's animation state through variants.
 */
export function StaggerItem({
  as = 'div',
  mode = 'rise',
  distance = 22,
  duration,
  className,
  style,
  children,
  ...rest
}) {
  const Component = motion[as] || motion.div

  return (
    <Component
      className={className}
      style={style}
      variants={revealVariants(mode, { distance, duration })}
      {...rest}
    >
      {children}
    </Component>
  )
}
