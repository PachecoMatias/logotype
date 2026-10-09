import { Reveal } from '../../motion/Reveal.jsx'

const DIRECTIONS = {
  up: 'rise',
  down: 'drop',
  left: 'left',
  right: 'right',
  fade: 'fade',
  scale: 'scale',
  clipTop: 'clipTop',
  clipBottom: 'clipBottom',
  clipLeft: 'clipLeft',
  clipRight: 'clipRight',
}

/**
 * Backward-compatible section reveal. `direction` maps to a motion mode;
 * `mode` overrides it with any Reveal mode.
 */
function AnimatedSection({
  children,
  direction = 'up',
  mode,
  delay = 0,
  distance = 28,
  amount,
  once = false,
  className = '',
  as = 'div',
  ...rest
}) {
  return (
    <Reveal
      as={as}
      mode={mode || DIRECTIONS[direction] || 'rise'}
      delay={delay}
      distance={distance}
      amount={amount}
      once={once}
      className={className}
      {...rest}
    >
      {children}
    </Reveal>
  )
}

export default AnimatedSection
