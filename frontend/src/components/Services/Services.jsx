import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import Card from '../common/Card.jsx'
import { services } from '../../data/content.js'

function Services() {
  return (
    <section id="servicios" className="objectives">
      <div className="container">
        <AnimatedSection direction="fade">
          <SectionTitle title="Productos y servicios" description="Soluciones que Logotype ofrece a sus clientes." />
        </AnimatedSection>

        <div className="cards">
          {services.map((service, index) => (
            <AnimatedSection key={service.id} direction="up" delay={index * 0.08}>
              <Card
                icon={service.icon}
                title={service.title}
                description={service.description}
                className="service-card"
              />
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Services
