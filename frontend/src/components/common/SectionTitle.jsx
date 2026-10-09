import { Reveal } from '../../motion/Reveal.jsx'
import SplitText from '../../motion/SplitText.jsx'
import { VIEW_TITLE } from '../../motion/tokens.js'

/**
 * Section heading.
 *
 * The title reveals word by word (SplitText) and the subtitle follows it, so a
 * heading reads as an authored editorial moment rather than a plain fade. Only
 * transform and clip-path are animated; the heading box is never layout-clipped,
 * so a missed viewport trigger can never leave a title invisible.
 */
function SectionTitle({ title, description, light = false, align = 'left', delay = 0 }) {
  return (
    <div
      className={`site-section-title site-section-title--${align}${light ? ' site-section-title--light' : ''}`}
    >
      <SplitText as="h2" text={title} delay={delay} />
      {description && (
        <Reveal as="p" mode="rise" distance={14} delay={delay + 0.16} amount={VIEW_TITLE.amount}>
          {description}
        </Reveal>
      )}
    </div>
  )
}

export default SectionTitle
