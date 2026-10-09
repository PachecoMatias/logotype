import { useState } from 'react'
import { motion } from 'framer-motion'
import { navLinks } from '../../data/content.js'
import { EASE_OUT, DURATION } from '../../motion/tokens.js'

// Navigation assembles once on load: the wordmark settles and the links arrive
// in sequence.
const navSeq = { hidden: {}, visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }

const navItem = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.state, ease: EASE_OUT } },
}

function Header({ onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleClick = (id) => {
    setMenuOpen(false)
    onNavigate(id)
  }

  return (
    <header className="site-header">
      <div className="site-shell site-header__inner">
        <motion.button
          className="site-wordmark"
          onClick={() => handleClick('inicio')}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: DURATION.layout, ease: EASE_OUT }}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.99 }}
        >
          LOGO<span>/TYPE</span>
        </motion.button>

        <button
          className="site-nav-toggle"
          aria-label="Abrir menú de navegación"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">{menuOpen ? '×' : '≡'}</span>
        </button>

        <motion.nav
          className={`site-nav${menuOpen ? ' site-nav--open' : ''}`}
          aria-label="Navegación principal"
          variants={navSeq}
          initial="hidden"
          animate="visible"
        >
          <ul>
            {navLinks.map((link) => (
              <motion.li key={link.id} variants={navItem}>
                <button className="site-nav__link" onClick={() => handleClick(link.id)}>{link.label}</button>
              </motion.li>
            ))}
            <motion.li variants={navItem}>
              <button className="site-nav__action" onClick={() => handleClick('configurador')}>
                Registrar proyecto <span aria-hidden="true">↗</span>
              </button>
            </motion.li>
          </ul>
        </motion.nav>
      </div>
    </header>
  )
}

export default Header
