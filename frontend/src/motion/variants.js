export const MOTION_EASE = [0.22, 1, 0.36, 1]

export const MOTION_DURATION = {
  quick: 1.5,
  base: 2.0,
  slow: 2.5,
}

export const VIEWPORT_ONCE = { once: true, amount: 0.2 }

export const parentVariants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.5,
    },
  },
}

export const titleGroupVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export const childVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: MOTION_DURATION.base, ease: MOTION_EASE },
    // Esto obliga a mantener la capa estable al finalizar:
    transitionEnd: { transform: "translateZ(0)" } 
  },
}

export const directionalVariants = (x = 0, y = 32) => ({
  hidden: { opacity: 0, x: Math.max(-40, Math.min(40, x)), y: Math.max(-40, Math.min(40, y)) },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: MOTION_DURATION.base, ease: MOTION_EASE },
    // Esto obliga a mantener la capa estable al finalizar:
    transitionEnd: { transform: "translateZ(0)" } 
  },
})

export const sectionContentVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export const fieldErrorMotion = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 1.0, ease: MOTION_EASE },
}
