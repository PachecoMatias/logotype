import { Fragment } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { EASE_OUT, DURATION, VIEW_TITLE } from './tokens.js'

// Editorial word reveal. Each word rises out of a soft mask in sequence while
// the heading stays one accessible string. Transform + clip-path only, so there
// is no layout impact and no shift. Leaving the viewport resets instantly.
const wordContainer = (stagger, delay) => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
})

const wordMask = {
  hidden: {
    y: '55%',
    clipPath: 'inset(100% -12% -12% -12%)',
    transition: { duration: 0 },
  },
  visible: {
    y: '0%',
    clipPath: 'inset(-42% -12% -12% -12%)',
    transition: { duration: DURATION.layout, ease: EASE_OUT },
  },
}

/**
 * Splits `text` into words and reveals them in a staggered rise. The vertical
 * clip is opened past the glyph box so accents and descenders are never cut.
 * Falls back to a plain fade under reduced motion.
 */
function SplitText({
  text,
  as = 'h2',
  className,
  stagger = 0.045,
  delay = 0,
  amount,
  once = false,
}) {
  const reduce = useReducedMotion()
  const Component = motion[as] || motion.h2
  const value = String(text)
  const words = value.split(' ')

  if (reduce) {
    return (
      <Component
        className={className}
        aria-label={value}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once, amount: amount ?? VIEW_TITLE.amount, margin: VIEW_TITLE.margin }}
        transition={{ duration: DURATION.state, ease: EASE_OUT }}
      >
        <span aria-hidden="true">{value}</span>
      </Component>
    )
  }

  return (
    <Component
      className={`split-text${className ? ` ${className}` : ''}`}
      aria-label={value}
      variants={wordContainer(stagger, delay)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: amount ?? VIEW_TITLE.amount, margin: VIEW_TITLE.margin }}
    >
      <span aria-hidden="true">
        {words.map((word, index) => (
          <Fragment key={`${word}-${index}`}>
            <motion.span className="split-word" variants={wordMask}>
              {word}
            </motion.span>
            {index < words.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </span>
    </Component>
  )
}

export default SplitText
