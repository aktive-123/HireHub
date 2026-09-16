export default function EmptyState({
  icon = 'inbox',
  title = 'Nothing here yet',
  text = '',
  action,
  className = '',
}) {
  return (
    <div className={`hh-empty ${className}`.trim()}>
      <div className="hh-empty-icon" aria-hidden="true">
        <i className={`bi bi-${icon}`} />
      </div>
      <h3 className="hh-empty-title">{title}</h3>
      {text && <p className="hh-empty-text">{text}</p>}
      {action}
    </div>
  )
}