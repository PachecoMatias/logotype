import { motion } from 'framer-motion'
import SectionTitle from '../common/SectionTitle.jsx'
import { problems, solutions } from '../../data/content.js'
import SectionReveal from '../../motion/SectionReveal.jsx'
import { directionalVariants, sectionContentVariants } from '../../motion/variants.js'

function ProblemSolution() {
  return (
    <SectionReveal id="problematica" className="site-section site-problem">
      <div className="site-shell">
        <SectionTitle
          title="Problemática y solución"
          description="El problema identificado y la propuesta informática desarrollada por Logotype."
          reveal="clipBottom"
          light
        />

        <motion.div className="site-problem__flow" variants={sectionContentVariants}>
          <motion.div className="site-problem__column site-problem__column--problem" variants={directionalVariants(-40, 0)}>
            <div>
              <h3>Problemática identificada</h3>
              <ul>
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div className="site-problem__column site-problem__column--solution" variants={directionalVariants(40, 0)}>
            <div>
              <h3>Solución propuesta</h3>
              <ul>
                {solutions.map((solution) => (
                  <li key={solution}>{solution}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </SectionReveal>
  )
}

export default ProblemSolution
