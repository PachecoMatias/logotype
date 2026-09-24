function Chip({ label, selected, onClick }) {
  return (
    <button type="button" className={`chip${selected ? ' selected' : ''}`} onClick={onClick}>
      {label}
    </button>
  )
}

export default Chip
