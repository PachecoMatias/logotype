import { motion } from 'framer-motion'
import SectionTitle from '../common/SectionTitle.jsx'
import { problems, solutions } from '../../data/content.js'
import { EASE_OUT, DURATION, VIEW, CLIP_VISIBLE, clipHidden } from '../../motion/tokens.js'

// Two facing columns: the problem slides in from the left, the solution from the
// right, and each list unmasks line by line. Hidden states reset instantly so
// scrolling away never replays a visible reverse animation.
const RESET = { duration: 0 }

const columnIn = (from) => ({
  hidden: { opacity: 0, x: from === 'left' ? -36 : 36, transition: RESET },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.focal, ease: EASE_OUT, delayChildren: 0.16, staggerChildren: 0.07 },
  },
})

const headIn = {
  hidden: { opacity: 0, y: 12, transition: RESET },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.layout, ease: EASE_OUT } },
}

const itemIn = {
  hidden: { opacity: 0, x: -12, clipPath: clipHidden('left'), transition: RESET },
  visible: { opacity: 1, x: 0, clipPath: CLIP_VISIBLE, transition: { duration: DURATION.layout, ease: EASE_OUT } },
}

function ProblemSolution() {
  return (
    <section id="problematica" className="site-section site-problem">
      <div className="site-shell">
        <SectionTitle
          title="Problemática y solución"
          description="El problema identificado y la propuesta informática desarrollada por Logotype."
          reveal="clipBottom"
          light
        />

        <div className="site-problem__flow">
          <motion.div
            className="site-problem__column site-problem__column--problem"
            variants={columnIn('left')}
            initial="hidden"
            whileInView="visible"
            viewport={VIEW}
          >
            <div>
              <motion.h3 variants={headIn}>Problemática identificada</motion.h3>
              <ul>
                {problems.map((problem) => (
                  <motion.li key={problem} variants={itemIn}>{problem}</motion.li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div
            className="site-problem__column site-problem__column--solution"
            variants={columnIn('right')}
            initial="hidden"
            whileInView="visible"
            viewport={VIEW}
          >
            <div>
              <motion.h3 variants={headIn}>Solución propuesta</motion.h3>
              <ul>
                {solutions.map((solution) => (
                  <motion.li key={solution} variants={itemIn}>{solution}</motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default ProblemSolution
