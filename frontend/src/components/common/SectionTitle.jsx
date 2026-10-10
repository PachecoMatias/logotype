import SplitText from '../../motion/SplitText.jsx'
import { Stagger } from '../../motion/Reveal.jsx' // Importamos nuestro nuevo Stagger nativo

function SectionTitle({ title, description, light = false, align = 'left' }) {
  return (
    <Stagger
      as="div"
      className={`site-section-title site-section-title--${align}${light ? ' site-section-title--light' : ''}`}
    >
      <SplitText as="h2" text={title} />
      {description && (
        <p className="css-motion mode-rise">{description}</p>
      )}
    </Stagger>
  )
}

export default SectionTitle