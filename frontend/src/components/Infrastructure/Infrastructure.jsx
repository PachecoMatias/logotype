import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import { infrastructure } from '../../data/content.js'

function Infrastructure() {
  return (
    <section id="infraestructura" className="site-section site-infrastructure">
      <div className="site-shell">
        <AnimatedSection direction="fade">
          <SectionTitle
            title="Infraestructura tecnológica"
            description="Resumen de las principales decisiones tomadas en el TP2."
          />
        </AnimatedSection>

        <div className="site-infrastructure__grid">
          {infrastructure.map((item, index) => (
            <AnimatedSection key={item.id} direction="up" delay={index * 0.08} className="site-infrastructure__item">
              <div>
                <span className="site-infrastructure__node" aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="site-infrastructure__value">{item.price}</div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Infrastructure
