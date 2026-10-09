import { motion } from 'framer-motion'
import SectionTitle from '../common/SectionTitle.jsx'
import { Stagger, StaggerItem } from '../../motion/Reveal.jsx'
import { services } from '../../data/content.js'

// The arrow leans into the reading direction when the row is hovered.
const arrowHover = { hover: { x: 6, y: 6 } }

function Services() {
  return (
    <section id="servicios" className="site-section site-services">
      <div className="site-shell">
        <SectionTitle
          title="Productos y servicios"
          description="Soluciones que Logotype ofrece a sus clientes."
          reveal="clipRight"
        />

        <Stagger className="site-services__list" stagger={0.08} amount={0.14}>
          {services.map((service, index) => (
            <StaggerItem
              key={service.id}
              mode="rise"
              distance={28}
              className="site-services__item"
              whileHover="hover"
            >
              <span className="site-services__code">SRV—{String(index + 1).padStart(2, '0')}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <motion.span className="site-services__arrow" aria-hidden="true" variants={arrowHover}>↘</motion.span>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

export default Services
