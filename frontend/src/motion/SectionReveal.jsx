import { useEffect, useRef, useState } from 'react'

function SectionReveal({ as = 'section', children, className = '', ...rest }) {
  const Component = as
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Configuramos el observador nativo
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect() // One-shot: dejamos de observar una vez que aparece
        }
      },
      { threshold: 0.1 } // Equivalente a tu amount: 0.1
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <Component
      ref={ref}
      // Combinamos tu className original con las clases de animación CSS
      className={`css-reveal ${isVisible ? 'is-visible' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  )
}

export default SectionReveal