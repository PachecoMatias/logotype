export default function SplitText({ text, as = 'h2', className = '' }) {
  const Component = as
  const value = String(text)

  return (
    <Component className={`split-text css-motion mode-rise ${className}`} aria-label={value}>
      <span aria-hidden="true">{value}</span>
    </Component>
  )
}