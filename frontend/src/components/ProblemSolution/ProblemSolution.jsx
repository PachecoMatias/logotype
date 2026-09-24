import SectionTitle from '../common/SectionTitle.jsx'
import AnimatedSection from '../common/AnimatedSection.jsx'
import { problems, solutions } from '../../data/content.js'

function ProblemSolution() {
  return (
    <section id="problematica" className="problem-section">
      <div className="container">
        <AnimatedSection direction="fade">
          <SectionTitle
            title="Problemática y solución"
            description="El problema identificado y la propuesta informática desarrollada por Logotype."
            light
          />
        </AnimatedSection>

        <div className="problem-grid">
          <AnimatedSection direction="left">
            <div className="problem-box">
              <h3>Problemática identificada</h3>
              <ul>
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </div>
          </AnimatedSection>

          <AnimatedSection direction="right">
            <div className="problem-box">
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
