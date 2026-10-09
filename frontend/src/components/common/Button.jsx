import { motion } from 'framer-motion'
import { EASE_OUT, DURATION } from '../../motion/tokens.js'

/**
 * variant: 'primary' | 'secondary' | 'outline'
 * Renders a <button> unless `href` is provided, in which case it renders an <a>.
 */
function Button({ children, variant = 'primary', href, onClick, type = 'button', disabled, className = '', ...rest }) {
  const classes = `btn btn-${variant}${className ? ` ${className}` : ''}`
  const motionProps = disabled
    ? {}
    : {
        whileHover: { y: -2 },
        whileTap: { y: 0, scale: 0.98 },
        transition: { duration: DURATION.feedback, ease: EASE_OUT },
      }

  if (href) {
    return (
      <motion.a href={href} className={classes} onClick={onClick} {...motionProps} {...rest}>
        {children}
      </motion.a>
    )
  }

  return (
    <motion.button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      {...motionProps}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export default Button
