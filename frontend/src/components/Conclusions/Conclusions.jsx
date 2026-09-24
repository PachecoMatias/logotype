import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import { conclusions } from '../../data/content.js'

function Conclusions() {
  return (
    <section id="conclusion" className="conclusion">
      <div className="container">
        <AnimatedSection direction="fade">
          <SectionTitle title="Conclusiones" />
        </AnimatedSection>

        <AnimatedSection direction="up">
          <div className="conclusion-box">
            {conclusions.map((paragraph) => (
              <p key={paragraph.slice(0, 20)}>{paragraph}</p>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}

export default Conclusions
