import SectionTitle from '../common/SectionTitle.jsx'
import { Stagger, StaggerItem } from '../../motion/Reveal.jsx'
import { conclusions } from '../../data/content.js'
import SectionReveal from '../../motion/SectionReveal.jsx'

function Conclusions() {
  return (
    <SectionReveal id="conclusion" className="site-section site-conclusions">
      <div className="site-shell">
        <SectionTitle title="Conclusiones" />

        <Stagger className="site-conclusions__copy" stagger={0.1}>
          {conclusions.map((paragraph, index) => (
            <StaggerItem as="p" key={paragraph.slice(0, 20)} mode="left">
              <span aria-hidden="true">{index + 1}</span>{paragraph}
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </SectionReveal>
  )
}

export default Conclusions
