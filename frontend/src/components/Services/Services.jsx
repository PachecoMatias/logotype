import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import { services } from '../../data/content.js'

function Services() {
  return (
    <section id="servicios" className="site-section site-services">
      <div className="site-shell">
        <AnimatedSection direction="fade">
          <SectionTitle title="Productos y servicios" description="Soluciones que Logotype ofrece a sus clientes." />
        </AnimatedSection>

        <div className="site-services__list">
          {services.map((service, index) => (
            <AnimatedSection key={service.id} direction="up" delay={index * 0.07} className="site-services__item">
              <span className="site-services__code">SRV—{String(index + 1).padStart(2, '0')}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <span className="site-services__arrow" aria-hidden="true">↘</span>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Services
