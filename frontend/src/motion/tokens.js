// Shared motion language for the Hero's authored mount sequence, configurator
// continuity, and interaction feedback.

export const EASE_OUT = [0.16, 1, 0.3, 1]
export const EASE_STANDARD = [0.22, 1, 0.36, 1]
export const EASE_IN = [0.55, 0, 1, 0.45]

export const DURATION = {
  feedback: 0.5,
  state: 0.8,
  layout: 1.2,
  focal: 1.8,
  construction: 2.5,
}

export const SPRING = { type: 'spring', stiffness: 340, damping: 34, mass: 0.7 }
export const SPRING_SOFT = { type: 'spring', stiffness: 190, damping: 26, mass: 0.9 }

export const CLIP_VISIBLE = 'inset(0% 0% 0% 0%)'
