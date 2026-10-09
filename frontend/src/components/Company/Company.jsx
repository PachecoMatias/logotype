import SectionTitle from '../common/SectionTitle.jsx'
import { Stagger, StaggerItem } from '../../motion/Reveal.jsx'
import { companyInfo } from '../../data/company.js'

function Company() {
  return (
    <section id="empresa" className="site-section site-company">
      <div className="site-shell">
        <SectionTitle
          title="Nuestra empresa"
          description="Información institucional de Logotype y los principales lineamientos que orientan nuestro trabajo."
        />

        <Stagger className="site-company__grid" stagger={0.09} amount={0.14}>
          {companyInfo.map((item, index) => (
            <StaggerItem
              key={item.id}
              mode="rise"
              distance={30}
              className={`site-company__item site-company__item--${item.id}`}
            >
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
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

export default Company
