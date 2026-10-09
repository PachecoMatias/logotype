import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionTitle from '../common/SectionTitle.jsx'
import { sidebarLinks, stats, tickets } from '../../data/content.js'
import { EASE_OUT, DURATION, VIEW } from '../../motion/tokens.js'

// The prototype window drops in, then its interior assembles: navigation
// staggers, KPI cards settle, and the ticket rows fill in one by one.
// A single viewport trigger drives the whole assembly (no nested triggers),
// which is what kept the section from flickering during scroll. Every hidden
// state resets instantly so scrolling away never replays a reverse animation.
const RESET = { duration: 0 }

const windowIn = {
  hidden: { opacity: 0, y: 40, transition: RESET },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.focal, ease: EASE_OUT } },
}

const asideSeq = { hidden: { transition: RESET }, visible: { transition: { staggerChildren: 0.06 } } }
const navIn = {
  hidden: { opacity: 0, x: -12, transition: RESET },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION.layout, ease: EASE_OUT } },
}

const dashSeq = { hidden: { transition: RESET }, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }
const headIn = {
  hidden: { opacity: 0, y: 12, transition: RESET },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.layout, ease: EASE_OUT } },
}

const statsSeq = { hidden: { transition: RESET }, visible: { transition: { staggerChildren: 0.08 } } }
const statIn = {
  hidden: { opacity: 0, y: 14, transition: RESET },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.layout, ease: EASE_OUT } },
}

const tableSeq = { hidden: { transition: RESET }, visible: { transition: { staggerChildren: 0.05 } } }
const rowIn = {
  hidden: { opacity: 0, y: 10, transition: RESET },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.state, ease: EASE_OUT } },
}

function SystemPrototype() {
  const [activeLink, setActiveLink] = useState('dashboard')

  return (
    <section id="sistema" className="site-section site-system">
      <div className="site-shell">
        <SectionTitle
          title="Prototipo funcional"
          description="Simulación de la plataforma de gestión desarrollada para Logotype."
          reveal="clipLeft"
        />

        <motion.div
          className="site-system__window"
          variants={windowIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ ...VIEW, amount: 0.12 }}
        >
          <div className="site-system__bar" aria-hidden="true">
            <span /> <span /> <span />
            <small>prototype.logotype.local</small>
          </div>
          <div className="site-system__layout">
            <motion.aside
              className="site-system__sidebar"
              variants={asideSeq}
            >
              <motion.h3 variants={navIn}>LOGOTYPE</motion.h3>
              {sidebarLinks.map((link) => (
                <motion.button
                  key={link.id}
                  className={activeLink === link.id ? 'site-system__nav-active' : ''}
                  variants={navIn}
                  onClick={() => setActiveLink(link.id)}
                >
                  <span aria-hidden="true">{String(sidebarLinks.indexOf(link) + 1).padStart(2, '0')}</span> {link.label}
                </motion.button>
              ))}
            </motion.aside>

            <motion.div
              className="site-system__dashboard"
              variants={dashSeq}
            >
              <motion.div className="site-system__dashboard-header" variants={headIn}>
                <div>
                  <h3>Panel de control</h3>
                  <p>Resumen de operaciones</p>
                </div>
                <div className="site-system__user"><span aria-hidden="true" />Administrador</div>
              </motion.div>

              <motion.div className="site-system__stats" variants={statsSeq}>
                {stats.map((stat) => (
                  <motion.div className="site-system__stat" key={stat.id} variants={statIn}>
                    <p>{stat.label}</p>
                    <strong>{stat.value}</strong>
                  </motion.div>
                ))}
              </motion.div>

              <motion.h3 className="site-system__table-title" variants={headIn}>Últimos tickets</motion.h3>

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
                  <motion.tbody variants={tableSeq}>
                    {tickets.map((ticket) => (
                      <motion.tr key={ticket.id} variants={rowIn}>
                        <td>{ticket.id}</td>
                        <td>{ticket.cliente}</td>
                        <td>{ticket.problema}</td>
                        <td>{ticket.prioridad}</td>
                        <td>
                          <span className={`site-system__status site-system__status--${ticket.estado}`}>{ticket.estadoLabel}</span>
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default SystemPrototype
