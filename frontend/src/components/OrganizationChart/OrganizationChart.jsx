import { motion } from 'framer-motion'
import SectionTitle from '../common/SectionTitle.jsx'
import { orgChart } from '../../data/company.js'
import SectionReveal from '../../motion/SectionReveal.jsx'
import { childVariants, parentVariants, sectionContentVariants } from '../../motion/variants.js'

function OrganizationChart() {
  return (
    <SectionReveal className="site-section site-organization">
      <div className="site-shell">
        <SectionTitle
          title="Organigrama"
          description="Estructura organizacional propuesta para Logotype."
          reveal="clipLeft"
        />

        <motion.div className="site-org" variants={sectionContentVariants}>
          <motion.div className="site-org__main" variants={childVariants}>{orgChart.main}</motion.div>

          <motion.div className="site-org__connector" aria-hidden="true" style={{ transformOrigin: 'center' }} variants={childVariants} />

          <motion.div className="site-org__row site-org__row--lead" variants={parentVariants}>
            {orgChart.level1.map((item) => (
              <motion.div className="site-org__node" key={item} variants={childVariants}>
                {item}
              </motion.div>
            ))}
          </motion.div>

          <motion.div className="site-org__connector" aria-hidden="true" style={{ transformOrigin: 'center' }} variants={childVariants} />

          <motion.div className="site-org__row" variants={parentVariants}>
            {orgChart.level2.map((item) => (
              <motion.div className="site-org__node site-org__node--team" key={item} variants={childVariants}>
                {item}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </SectionReveal>
  )
}

export default OrganizationChart
