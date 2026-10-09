// Shared motion language for the Hero's authored mount sequence, configurator
// continuity, and interaction feedback.

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

export const CLIP_VISIBLE = 'inset(0% 0% 0% 0%)'
