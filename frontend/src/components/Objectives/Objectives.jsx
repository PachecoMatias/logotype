import SectionTitle from '../common/SectionTitle.jsx'
import { Stagger, StaggerItem } from '../../motion/Reveal.jsx'
import { objectives } from '../../data/company.js'

function Objectives() {
  return (
    <section className="site-section site-objectives">
      <div className="site-shell">
        <SectionTitle
          title="Objetivos"
          description="Principales objetivos estratégicos de Logotype."
          reveal="clipTop"
        />

        <Stagger className="site-objectives__list" stagger={0.1} amount={0.16}>
          {objectives.map((obj, index) => (
            <StaggerItem key={obj.id} mode="left" distance={38} className="site-objectives__item">
              <span className="site-objectives__mark" aria-hidden="true">{index + 1}</span>
              <div>
                <h3>{obj.title}</h3>
                <p>{obj.description}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

export default Objectives
