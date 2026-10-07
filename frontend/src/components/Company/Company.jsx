import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import { companyInfo } from '../../data/company.js'

function Company() {
  return (
    <section id="empresa" className="site-section site-company">
      <div className="site-shell">
        <AnimatedSection direction="fade">
          <SectionTitle
            title="Nuestra empresa"
            description="Información institucional de Logotype y los principales lineamientos que orientan nuestro trabajo."
          />
        </AnimatedSection>

        <div className="site-company__grid">
          {companyInfo.map((item, index) => (
            <AnimatedSection key={item.id} direction={index % 2 ? 'up' : 'fade'} delay={index * 0.06} className={`site-company__item site-company__item--${item.id}`}>
              <div>
                <span className="site-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
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
