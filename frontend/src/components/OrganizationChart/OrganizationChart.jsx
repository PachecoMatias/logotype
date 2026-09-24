import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import { orgChart } from '../../data/company.js'

function OrganizationChart() {
  return (
    <section>
      <div className="container">
        <AnimatedSection direction="fade">
          <SectionTitle title="Organigrama" description="Estructura organizacional propuesta para Logotype." />
        </AnimatedSection>

        <AnimatedSection direction="up">
          <div className="organigrama">
            <div className="org-box main">{orgChart.main}</div>

            <div className="org-line" />

            <div className="org-grid">
              {orgChart.level1.map((item) => (
                <div className="org-box" key={item}>
                  {item}
                </div>
              ))}
            </div>

            <div className="org-line" />

            <div className="org-grid">
              {orgChart.level2.map((item) => (
                <div className="org-box" key={item}>
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
