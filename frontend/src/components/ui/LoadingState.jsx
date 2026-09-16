export default function LoadingState({
  text = 'Loading…',
  className = '',
}) {
  return (
    <div
      className={`hh-loading ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span className="hh-spinner" aria-hidden="true" />
      <span className="hh-loading-text">{text}</span>
    </div>
  )
}