// Shared motion language for the Logotype public site and project configurator.
// One authored identity: confident deceleration, short feedback, constructed
// reveals. Only transform, opacity and clip-path are animated.

export const EASE_OUT = [0.16, 1, 0.3, 1]
export const EASE_STANDARD = [0.22, 1, 0.36, 1]
export const EASE_IN = [0.55, 0, 1, 0.45]

export const DURATION = {
  feedback: 0.16,
  state: 0.28,
  layout: 0.44,
  focal: 0.64,
  construction: 0.92,
}

export const SPRING = { type: 'spring', stiffness: 340, damping: 34, mass: 0.7 }
export const SPRING_SOFT = { type: 'spring', stiffness: 190, damping: 26, mass: 0.9 }

// Viewport configs. `once: false` so a reveal replays every time the element
// re-enters the viewport. The negative bottom margin pulls the trigger point up
// from the very edge, which prevents boundary toggling (flicker) while keeping
// the reveal feeling immediate. Margins use px (unambiguous rootMargin).
export const VIEW = { once: false, amount: 0.2, margin: '0px 0px -72px 0px' }
export const VIEW_EARLY = { once: false, amount: 0.12, margin: '0px 0px -54px 0px' }
export const VIEW_TITLE = { once: false, amount: 0.18, margin: '0px 0px -54px 0px' }

export const CLIP_VISIBLE = 'inset(0% 0% 0% 0%)'

// Hidden clip paths keyed by the edge the reveal grows from.
export function clipHidden(from = 'left') {
  switch (from) {
    case 'top':
      return 'inset(0% 0% 100% 0%)'
    case 'bottom':
      return 'inset(100% 0% 0% 0%)'
    case 'right':
      return 'inset(0% 0% 0% 100%)'
    case 'left':
    default:
      return 'inset(0% 100% 0% 0%)'
  }
}

// Configurator: step container + fields (labels hidden/show).
export const stepContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

export const stepField = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.layout, ease: EASE_OUT } },
}

// A grid of selectable cards/chips inside a step.
export const stepGroup = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

// Configurator: progressive summary construction.
export const summaryContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}

export const summaryItem = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.layout, ease: EASE_OUT } },
}
