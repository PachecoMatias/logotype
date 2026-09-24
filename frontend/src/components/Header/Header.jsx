import { useState } from 'react'
import { navLinks } from '../../data/content.js'

function Header({ onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleClick = (id) => {
    setMenuOpen(false)
    onNavigate(id)
  }

  return (
    <header>
      <div className="container navbar">
        <button className="logo" onClick={() => handleClick('inicio')}>
          LOGO<span>TYPE</span>
        </button>

        <button
          className="nav-toggle"
          aria-label="Abrir menú de navegación"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <ul className={`nav-links${menuOpen ? ' open' : ''}`}>
          {navLinks.map((link) => (
            <li key={link.id}>
              <button onClick={() => handleClick(link.id)}>{link.label}</button>
            </li>
          ))}
          <li>
            <button className="nav-cta" onClick={() => handleClick('configurador')}>
              Contanos tu proyecto
            </button>
          </li>
        </ul>
      </div>
    </header>
  )
}

export default Header
