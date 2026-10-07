import { useState } from 'react'
import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import { sidebarLinks, stats, tickets } from '../../data/content.js'

function SystemPrototype() {
  const [activeLink, setActiveLink] = useState('dashboard')

  return (
    <section id="sistema" className="site-section site-system">
      <div className="site-shell">
        <AnimatedSection direction="fade">
          <SectionTitle
            title="Prototipo funcional"
            description="Simulación de la plataforma de gestión desarrollada para Logotype."
          />
        </AnimatedSection>

        <AnimatedSection direction="up">
          <div className="site-system__window">
            <div className="site-system__bar" aria-hidden="true">
              <span /> <span /> <span />
              <small>prototype.logotype.local</small>
            </div>
            <div className="site-system__layout">
            <aside className="site-system__sidebar">
              <h3>LOGOTYPE</h3>
              {sidebarLinks.map((link) => (
                <button
                  key={link.id}
                  className={activeLink === link.id ? 'site-system__nav-active' : ''}
                  onClick={() => setActiveLink(link.id)}
                >
                  <span aria-hidden="true">{String(sidebarLinks.indexOf(link) + 1).padStart(2, '0')}</span> {link.label}
                </button>
              ))}
            </aside>

            <div className="site-system__dashboard">
              <div className="site-system__dashboard-header">
                <div>
                  <h3>Panel de control</h3>
                  <p>Resumen de operaciones</p>
                </div>
                <div className="site-system__user"><span aria-hidden="true" />Administrador</div>
              </div>

              <div className="site-system__stats">
                {stats.map((stat) => (
                  <div className="site-system__stat" key={stat.id}>
                    <p>{stat.label}</p>
                    <strong>{stat.value}</strong>
                  </div>
                ))}
              </div>

              <h3 className="site-system__table-title">Últimos tickets</h3>

              <div className="site-system__table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Cliente</th>
                      <th>Problema</th>
                      <th>Prioridad</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td>{ticket.id}</td>
                        <td>{ticket.cliente}</td>
                        <td>{ticket.problema}</td>
                        <td>{ticket.prioridad}</td>
                        <td>
                          <span className={`site-system__status site-system__status--${ticket.estado}`}>{ticket.estadoLabel}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}

export default SystemPrototype
