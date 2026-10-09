import { useEffect, useMemo, useRef } from 'react'
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { MOTION_DURATION, MOTION_EASE, VIEWPORT_ONCE } from './variants.js'

function parseNumericValue(value) {
  const text = String(value)
  const match = text.match(/^(.*?)(\d[\d.,]*)(.*)$/)

  if (!match) return null

  const [, prefix, numericText, suffix] = match
  const digits = numericText.replace(/\D/g, '')
  if (!digits) return null

  const separator = numericText.includes('.')
    ? '.'
    : numericText.includes(',')
      ? ','
      : ''

  return {
    prefix,
    suffix,
    separator,
    target: Number(digits),
    original: text,
  }
}

function groupInteger(value, separator) {
  const digits = String(Math.max(0, Math.round(value)))
  if (!separator) return digits
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
}

function AnimatedCounter({ value, className }) {
  const ref = useRef(null)
  const reduceMotion = useReducedMotion()
  const parsed = useMemo(() => parseNumericValue(value), [value])
  const count = useMotionValue(reduceMotion && parsed ? parsed.target : 0)
  const inView = useInView(ref, VIEWPORT_ONCE)
  const display = useTransform(count, (latest) => {
    if (!parsed) return String(value)
    return `${parsed.prefix}${groupInteger(latest, parsed.separator)}${parsed.suffix}`
  })

  useEffect(() => {
    if (!parsed) return undefined

    if (reduceMotion) {
      count.set(parsed.target)
      return undefined
    }

    if (!inView) return undefined

    const controls = animate(count, parsed.target, {
      duration: MOTION_DURATION.slow,
      ease: MOTION_EASE,
    })

    return () => controls.stop()
  }, [count, inView, parsed, reduceMotion])

  if (!parsed) return <span className={className}>{value}</span>

  return (
    <span ref={ref} className={`animated-counter${className ? ` ${className}` : ''}`} aria-label={parsed.original}>
      <span className="animated-counter__measure" aria-hidden="true">{parsed.original}</span>
      <motion.span className="animated-counter__value" aria-hidden="true">
        {reduceMotion ? parsed.original : display}
      </motion.span>
    </span>
  )
}

export default AnimatedCounter
