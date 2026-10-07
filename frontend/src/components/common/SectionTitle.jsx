function SectionTitle({ title, description, light = false, align = 'left' }) {
  return (
    <div className={`site-section-title site-section-title--${align}${light ? ' site-section-title--light' : ''}`}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  )
}

export default SectionTitle
