import { useEffect, useRef, useState } from 'react'

export function useNativeInView(options = { threshold: 0.1 }) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }, options)

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return [ref, isVisible]
}

export function Reveal({ as = 'div', mode = 'rise', className = '', children, ...props }) {
  const Component = as
  const [ref, isVisible] = useNativeInView()
  // Filtramos props de framer-motion
  const { viewport, amount, once, delay, duration, ...rest } = props

  return (
    <Component
      ref={ref}
      className={`css-motion mode-${mode} ${isVisible ? 'is-visible' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  )
}

export function Stagger({ as = 'div', className = '', children, ...props }) {
  const Component = as
  const [ref, isVisible] = useNativeInView()
  // Filtramos props de framer-motion para evitar los warnings de React
  const { stagger, delayChildren, viewport, amount, once, whileInView, initial, animate, variants, mount, ...rest } = props

  return (
    <Component
      ref={ref}
      className={`stagger-group ${isVisible ? 'is-visible' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  )
}

export function StaggerItem({ as = 'div', mode = 'rise', className = '', children, ...props }) {
  const Component = as
  // Filtramos props de framer-motion para evitar los warnings de React
  const { whileHover, whileTap, transition, variants, distance, duration, layoutId, ...rest } = props

  return (
    <Component className={`css-motion mode-${mode} ${className}`} {...rest}>
      {children}
    </Component>
  )
}