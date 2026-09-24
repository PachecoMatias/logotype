import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import { companyInfo } from '../../data/company.js'

function Company() {
  return (
    <section id="empresa">
      <div className="container">
        <AnimatedSection direction="fade">
          <SectionTitle
            title="Nuestra empresa"
            description="Información institucional de Logotype y los principales lineamientos que orientan nuestro trabajo."
          />
        </AnimatedSection>

        <div className="company-grid">
          {companyInfo.map((item, index) => (
            <AnimatedSection key={item.id} direction="up" delay={index * 0.08}>
              <div className="info-card">
                <h3>{item.title}</h3>
                {item.lines.map((line, i) =>
                  line.strong ? (
                    <p key={i}>
                      <strong>{line.strong}</strong>
                    </p>
                  ) : (
                    <p key={i}>{line.text}</p>
                  )
                )}
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Company
