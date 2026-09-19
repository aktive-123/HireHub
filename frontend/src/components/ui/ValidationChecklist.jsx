export default function ValidationChecklist({ items, className = '', ariaLabel }) {
  return (
    <ul className={`hh-checklist ${className}`.trim()} aria-label={ariaLabel}>
      {items.map(({ ok, label }) => (
        <li key={label} className={`hh-checklist-item ${ok ? 'is-met' : ''}`}>
          <i
            className={`bi ${ok ? 'bi-check-circle-fill' : 'bi-circle'}`}
            aria-hidden="true"
          />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  )
}