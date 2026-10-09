import { motion } from 'framer-motion'
import {
  directionalVariants,
  MOTION_DURATION,
  MOTION_EASE,
  parentVariants,
  VIEWPORT_ONCE,
} from './variants.js'

export function revealVariants({ mode = 'rise', distance = 32, duration = MOTION_DURATION.base } = {}) {
  const offset = Math.max(24, Math.min(40, distance))
  const directions = {
    fade: directionalVariants(0, 0),
    rise: directionalVariants(0, offset),
    up: directionalVariants(0, offset),
    drop: directionalVariants(0, -offset),
    down: directionalVariants(0, -offset),
    left: directionalVariants(-offset, 0),
    right: directionalVariants(offset, 0),
  }

  const variants = directions[mode] || directions.rise
  return {
    ...variants,
    visible: {
      ...variants.visible,
      transition: { ...variants.visible.transition, duration },
    },
  }
}

/**
 * Stable wrapper retaining the former reveal API and rendered element.
 */
export function Reveal({
  as = 'div',
  mode = 'rise',
  distance = 32,
  delay,
  duration = MOTION_DURATION.base,
  amount,
  once,
  viewport = true,
  className,
  style,
  children,
  ...rest
}) {
  const Component = motion[as] || motion.div
  void delay
  void amount
  void once
  const variants = revealVariants({ mode, distance, duration })
  const viewportProps = viewport
    ? { initial: 'hidden', whileInView: 'visible', viewport: VIEWPORT_ONCE }
    : {}

  return (
    <Component
      className={className}
      style={style}
      variants={variants}
      {...viewportProps}
      {...rest}
    >
      {children}
    </Component>
  )
}

/**
 * Stable group wrapper retaining the former stagger API.
 */
export function Stagger({
  as = 'div',
  stagger = 0.1,
  delayChildren = 0,
  amount,
  once,
  viewport = false,
  className,
  style,
  children,
  ...rest
}) {
  const Component = motion[as] || motion.div
  void amount
  void once
  const variants = {
    ...parentVariants,
    visible: { transition: { delayChildren, staggerChildren: stagger } },
  }
  const viewportProps = viewport
    ? { initial: 'hidden', whileInView: 'visible', viewport: VIEWPORT_ONCE }
    : {}

  return (
    <Component
      data-reveal-stagger=""
      className={className}
      style={style}
      variants={variants}
      {...viewportProps}
      {...rest}
    >
      {children}
    </Component>
  )
}

/**
 * Stable child wrapper that still supports safe interaction motion props.
 */
export function StaggerItem({
  as = 'div',
  mode = 'rise',
  distance = 32,
  duration = MOTION_DURATION.base,
  className,
  style,
  children,
  ...rest
}) {
  const Component = motion[as] || motion.div
  return (
    <Component
      data-reveal-item=""
      className={className}
      style={style}
      variants={revealVariants({ mode, distance, duration })}
      {...rest}
    >
      {children}
    </Component>
  )
}
