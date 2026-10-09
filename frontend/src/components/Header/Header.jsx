import { useState } from 'react'
import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { navLinks } from '../../data/content.js'
import { MOTION_EASE } from '../../motion/variants.js'

function Header({ onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { scrollY, scrollYProgress } = useScroll()

  useMotionValueEvent(scrollY, 'change', (value) => setScrolled(value > 48))

  const handleClick = (id) => {
    setMenuOpen(false)
    onNavigate(id)
  }

  return (
    <motion.header
      className={`site-header${scrolled ? ' site-header--scrolled' : ''}`}
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: MOTION_EASE }}
    >
      <motion.div
        className="site-scroll-progress"
        aria-hidden="true"
        style={{ scaleX: scrollYProgress, transformOrigin: 'left center' }}
      />
      <div className="site-shell site-header__inner">
        <motion.button
          className="site-wordmark"
          onClick={() => handleClick('inicio')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          LOGO<span>/TYPE</span>
        </motion.button>

        <motion.button
          className="site-nav-toggle"
          aria-label="Abrir menú de navegación"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span aria-hidden="true">{menuOpen ? '×' : '≡'}</span>
        </motion.button>

        <nav
          className={`site-nav${menuOpen ? ' site-nav--open' : ''}`}
          aria-label="Navegación principal"
        >
          <ul>
            {navLinks.map((link) => (
              <li key={link.id}>
                <motion.button
                  className="site-nav__link"
                  onClick={() => handleClick(link.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {link.label}
                </motion.button>
              </li>
            ))}
            <li>
              <motion.button
                className="site-nav__action"
                onClick={() => handleClick('configurador')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Registrar proyecto <span aria-hidden="true">↗</span>
              </motion.button>
            </li>
          </ul>
        </nav>
      </div>
    </motion.header>
  )
}

export default Header
