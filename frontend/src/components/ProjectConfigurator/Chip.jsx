/**
 * Selectable chip that remains visible by default and only animates
 * interaction feedback.
 */
function Chip({ label, selected, onClick, index = 0 }) {
  return (
    <button
      type="button"
      className={`cfg-chip${selected ? ' cfg-chip--selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
      style={{
        transition: "transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.16s, background-color 0.16s",
        willChange: "transform"
      }}
      onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
      onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
    >
      <span aria-hidden="true">{selected ? '✓' : '+'}</span>{label}
    </button>
  )
}

export default Chip