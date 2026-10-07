import { useState } from 'react'
import { navLinks } from '../../data/content.js'

function Header({ onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleClick = (id) => {
    setMenuOpen(false)
    onNavigate(id)
  }

  return (
    <header className="site-header">
      <div className="site-shell site-header__inner">
        <button className="site-wordmark" onClick={() => handleClick('inicio')}>
          LOGO<span>/TYPE</span>
        </button>

        <button
          className="site-nav-toggle"
          aria-label="Abrir menú de navegación"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">{menuOpen ? '×' : '≡'}</span>
        </button>

        <nav className={`site-nav${menuOpen ? ' site-nav--open' : ''}`} aria-label="Navegación principal">
          <ul>
          {navLinks.map((link) => (
            <li key={link.id}>
              <button className="site-nav__link" onClick={() => handleClick(link.id)}>{link.label}</button>
            </li>
          ))}
          <li>
            <button className="site-nav__action" onClick={() => handleClick('configurador')}>
              Registrar proyecto <span aria-hidden="true">↗</span>
            </button>
          </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Header
