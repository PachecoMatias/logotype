import { motion } from 'framer-motion'
import SectionTitle from '../common/SectionTitle.jsx'
import { Stagger, StaggerItem } from '../../motion/Reveal.jsx'
import { infrastructure } from '../../data/content.js'
import { EASE_OUT, DURATION } from '../../motion/tokens.js'

// Each card's marker settles just after the card itself, so the diagram reads
// as assembled rather than stamped. Hidden resets instantly on leave.
const nodeIn = {
  hidden: { scale: 0, opacity: 0, transition: { duration: 0 } },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: DURATION.state, ease: EASE_OUT, delay: 0.08 },
  },
}

function Infrastructure() {
  return (
    <section id="infraestructura" className="site-section site-infrastructure">
      <div className="site-shell">
        <SectionTitle
          title="Infraestructura tecnológica"
          description="Resumen de las principales decisiones tomadas en el TP2."
          reveal="clipTop"
        />

        <Stagger className="site-infrastructure__grid" stagger={0.09} amount={0.14}>
          {infrastructure.map((item) => (
            <StaggerItem key={item.id} mode="rise" distance={30} className="site-infrastructure__item">
              <div>
                <motion.span className="site-infrastructure__node" aria-hidden="true" variants={nodeIn} />
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="site-infrastructure__value">{item.price}</div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

export default Infrastructure
