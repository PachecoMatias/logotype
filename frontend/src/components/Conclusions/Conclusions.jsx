import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import { conclusions } from '../../data/content.js'

function Conclusions() {
  return (
    <section id="conclusion" className="site-section site-conclusions">
      <div className="site-shell">
        <AnimatedSection direction="fade">
          <SectionTitle title="Conclusiones" />
        </AnimatedSection>

        <AnimatedSection direction="up">
          <div className="site-conclusions__copy">
            {conclusions.map((paragraph, index) => (
              <p key={paragraph.slice(0, 20)}><span aria-hidden="true">{index + 1}</span>{paragraph}</p>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}

export default Conclusions
