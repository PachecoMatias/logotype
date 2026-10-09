import SectionTitle from '../common/SectionTitle.jsx'
import { Stagger, StaggerItem } from '../../motion/Reveal.jsx'
import { infrastructure } from '../../data/content.js'
import SectionReveal from '../../motion/SectionReveal.jsx'
import AnimatedCounter from '../../motion/AnimatedCounter.jsx'

function Infrastructure() {
  return (
    <SectionReveal id="infraestructura" className="site-section site-infrastructure">
      <div className="site-shell">
        <SectionTitle
          title="Infraestructura tecnológica"
          description="Resumen de las principales decisiones tomadas en el TP2."
        />

        <Stagger className="site-infrastructure__grid" stagger={0.09}>
          {infrastructure.map((item) => (
            <StaggerItem key={item.id} mode="rise" distance={30} className="site-infrastructure__item">
              <div>
                <span className="site-infrastructure__node" aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="site-infrastructure__value"><AnimatedCounter value={item.price} /></div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </SectionReveal>
  )
}

export default Infrastructure
