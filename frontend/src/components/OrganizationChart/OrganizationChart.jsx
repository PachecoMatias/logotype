import { motion } from 'framer-motion'
import SectionTitle from '../common/SectionTitle.jsx'
import { orgChart } from '../../data/company.js'
import { EASE_OUT, DURATION, VIEW } from '../../motion/tokens.js'

// Structure is built top-down: the root block settles, the connectors draw,
// then each level of nodes drops into place. Hidden states reset instantly so
// leaving the viewport never replays a visible reverse animation.
const RESET = { duration: 0 }

const orgSeq = { hidden: { transition: RESET }, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } }

const mainIn = {
  hidden: { opacity: 0, y: 18, scale: 0.97, transition: RESET },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: DURATION.focal, ease: EASE_OUT } },
}

const connectorIn = {
  hidden: { scaleY: 0, transition: RESET },
  visible: { scaleY: 1, transition: { duration: DURATION.layout, ease: EASE_OUT } },
}

const rowSeq = { hidden: { transition: RESET }, visible: { transition: { staggerChildren: 0.07 } } }

const nodeIn = {
  hidden: { opacity: 0, y: 14, transition: RESET },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.layout, ease: EASE_OUT } },
}

function OrganizationChart() {
  return (
    <section className="site-section site-organization">
      <div className="site-shell">
        <SectionTitle
          title="Organigrama"
          description="Estructura organizacional propuesta para Logotype."
          reveal="clipLeft"
        />

        <motion.div className="site-org" variants={orgSeq} initial="hidden" whileInView="visible" viewport={VIEW}>
          <motion.div className="site-org__main" variants={mainIn}>{orgChart.main}</motion.div>

          <motion.div className="site-org__connector" aria-hidden="true" variants={connectorIn} style={{ transformOrigin: 'center' }} />

          <motion.div className="site-org__row site-org__row--lead" variants={rowSeq}>
            {orgChart.level1.map((item) => (
              <motion.div className="site-org__node" key={item} variants={nodeIn}>
                {item}
              </motion.div>
            ))}
          </motion.div>

          <motion.div className="site-org__connector" aria-hidden="true" variants={connectorIn} style={{ transformOrigin: 'center' }} />

          <motion.div className="site-org__row" variants={rowSeq}>
            {orgChart.level2.map((item) => (
              <motion.div className="site-org__node site-org__node--team" key={item} variants={nodeIn}>
                {item}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default OrganizationChart
