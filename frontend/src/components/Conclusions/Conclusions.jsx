import SectionTitle from '../common/SectionTitle.jsx'
import { Stagger, StaggerItem } from '../../motion/Reveal.jsx'
import { conclusions } from '../../data/content.js'

function Conclusions() {
  return (
    <section id="conclusion" className="site-section site-conclusions">
      <div className="site-shell">
        <SectionTitle title="Conclusiones" reveal="clipBottom" />

        <Stagger className="site-conclusions__copy" stagger={0.1} amount={0.2}>
          {conclusions.map((paragraph, index) => (
            <StaggerItem as="p" key={paragraph.slice(0, 20)} mode="clipLeft">
              <span aria-hidden="true">{index + 1}</span>{paragraph}
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

export default Conclusions
