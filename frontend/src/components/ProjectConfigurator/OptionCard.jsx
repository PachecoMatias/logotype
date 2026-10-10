/**
 * Selectable card used across configurator steps (single or multi select).
 * Options remain visible by default and only animate interaction feedback.
 */
function OptionCard({ icon, title, description, selected, onClick, index = 0 }) {
  return (
    <button
      type="button"
      className={`cfg-option${selected ? ' cfg-option--selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
      style={{
        transition: "transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.16s",
        willChange: "transform"
      }}
      onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
      onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
    >
      <span className="cfg-option__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      <span className="cfg-option__copy">
        <span className="cfg-option__title">{title}</span>
        {description && <span className="cfg-option__description">{description}</span>}
      </span>
      <span className="cfg-option__state" aria-hidden="true">{selected ? '✓' : '＋'}</span>
    </button>
  )
}

export default OptionCard