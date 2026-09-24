import { useState } from 'react'
import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import { sidebarLinks, stats, tickets } from '../../data/content.js'

function SystemPrototype() {
  const [activeLink, setActiveLink] = useState('dashboard')

  return (
    <section id="sistema" className="system-section">
      <div className="container">
        <AnimatedSection direction="fade">
          <SectionTitle
            title="Prototipo funcional"
            description="Simulación de la plataforma de gestión desarrollada para Logotype."
          />
        </AnimatedSection>

        <AnimatedSection direction="up">
          <div className="system-layout">
            <aside className="sidebar">
              <h3>LOGOTYPE</h3>
              {sidebarLinks.map((link) => (
                <button
                  key={link.id}
                  className={activeLink === link.id ? 'active' : ''}
                  onClick={() => setActiveLink(link.id)}
                >
                  {link.icon} {link.label}
                </button>
              ))}
            </aside>

            <main className="dashboard">
              <div className="dashboard-header">
                <div>
                  <h3>Panel de control</h3>
                  <p>Resumen de operaciones</p>
                </div>
                <div className="user">Administrador</div>
              </div>

              <div className="stats">
                {stats.map((stat) => (
                  <div className="stat" key={stat.id}>
                    <p>{stat.label}</p>
                    <strong>{stat.value}</strong>
                  </div>
                ))}
              </div>

              <h3 style={{ marginBottom: 15 }}>Últimos tickets</h3>

              <div className="table-container">
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
                          <span className={`status ${ticket.estado}`}>{ticket.estadoLabel}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </main>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}

export default SystemPrototype
