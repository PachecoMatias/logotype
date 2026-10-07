import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import { objectives } from '../../data/company.js'

function Objectives() {
  return (
    <section className="site-section site-objectives">
      <div className="site-shell">
        <AnimatedSection direction="fade">
          <SectionTitle title="Objetivos" description="Principales objetivos estratégicos de Logotype." />
        </AnimatedSection>

        <div className="site-objectives__list">
          {objectives.map((obj, index) => (
            <AnimatedSection key={obj.id} direction="up" delay={index * 0.08} className="site-objectives__item">
              <span className="site-objectives__mark" aria-hidden="true">{index + 1}</span>
              <div>
                <h3>{obj.title}</h3>
                <p>{obj.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Objectives
