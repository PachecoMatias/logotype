import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import { infrastructure } from '../../data/content.js'

function Infrastructure() {
  return (
    <section id="infraestructura">
      <div className="container">
        <AnimatedSection direction="fade">
          <SectionTitle
            title="Infraestructura tecnológica"
            description="Resumen de las principales decisiones tomadas en el TP2."
          />
        </AnimatedSection>

        <div className="infra-grid">
          {infrastructure.map((item, index) => (
            <AnimatedSection key={item.id} direction="up" delay={index * 0.08}>
              <div className="infra-card">
                <h3>
                  {item.icon} {item.title}
                </h3>
                <p>{item.description}</p>
                <div className="price">{item.price}</div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Infrastructure
