import { motion } from 'framer-motion'
import SplitText from '../../motion/SplitText.jsx'
import { childVariants, titleGroupVariants } from '../../motion/variants.js'

/**
 * Section heading.
 *
 * Both title and description render visibly without viewport-dependent state.
 */
function SectionTitle({ title, description, light = false, align = 'left' }) {
  return (
    <motion.div
      className={`site-section-title site-section-title--${align}${light ? ' site-section-title--light' : ''}`}
      variants={titleGroupVariants}
    >
      <SplitText as="h2" text={title} />
      {description && (
        <motion.p variants={childVariants}>{description}</motion.p>
      )}
    </motion.div>
  )
}

export default SectionTitle
