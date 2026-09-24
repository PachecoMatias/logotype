function SectionTitle({ title, description, light = false }) {
  return (
    <div className="section-title">
      <h2 style={light ? { color: 'white' } : undefined}>{title}</h2>
      {description && (
        <p style={light ? { color: '#cbd5e1' } : undefined}>{description}</p>
      )}
    </div>
  )
}

export default SectionTitle
