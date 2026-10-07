import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import { orgChart } from '../../data/company.js'

function OrganizationChart() {
  return (
    <section className="site-section site-organization">
      <div className="site-shell">
        <AnimatedSection direction="fade">
          <SectionTitle title="Organigrama" description="Estructura organizacional propuesta para Logotype." />
        </AnimatedSection>

        <AnimatedSection direction="up">
          <div className="site-org">
            <div className="site-org__main">{orgChart.main}</div>

            <div className="site-org__connector" aria-hidden="true" />

            <div className="site-org__row site-org__row--lead">
              {orgChart.level1.map((item) => (
                <div className="site-org__node" key={item}>
                  {item}
                </div>
              ))}
            </div>

            <div className="site-org__connector" aria-hidden="true" />

            <div className="site-org__row">
              {orgChart.level2.map((item) => (
                <div className="site-org__node site-org__node--team" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}

export default OrganizationChart
