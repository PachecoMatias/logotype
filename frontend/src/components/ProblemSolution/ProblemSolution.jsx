import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import { problems, solutions } from '../../data/content.js'

function ProblemSolution() {
  return (
    <section id="problematica" className="site-section site-problem">
      <div className="site-shell">
        <AnimatedSection direction="fade">
          <SectionTitle
            title="Problemática y solución"
            description="El problema identificado y la propuesta informática desarrollada por Logotype."
            light
          />
        </AnimatedSection>

        <div className="site-problem__flow">
          <AnimatedSection direction="left" className="site-problem__column site-problem__column--problem">
            <div>
              <h3>Problemática identificada</h3>
              <ul>
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </div>
          </AnimatedSection>

          <AnimatedSection direction="right" className="site-problem__column site-problem__column--solution">
            <div>
              <h3>Solución propuesta</h3>
              <ul>
                {solutions.map((solution) => (
                  <li key={solution}>{solution}</li>
                ))}
              </ul>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  )
}

export default ProblemSolution
