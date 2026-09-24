import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import Card from '../common/Card.jsx'
import { objectives } from '../../data/company.js'

function Objectives() {
  return (
    <section className="objectives">
      <div className="container">
        <AnimatedSection direction="fade">
          <SectionTitle title="Objetivos" description="Principales objetivos estratégicos de Logotype." />
        </AnimatedSection>

        <div className="cards">
          {objectives.map((obj, index) => (
            <AnimatedSection key={obj.id} direction="up" delay={index * 0.1}>
              <Card icon={obj.icon} title={obj.title} description={obj.description} />
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Objectives
