export default function Alert({
  variant = 'info',
  icon,
  dismissible = false,
  onDismiss,
  children,
  className = '',
}) {
  const iconMap = {
    info: 'info-circle',
    success: 'check-circle',
    warning: 'exclamation-triangle',
    danger: 'exclamation-octagon',
  }

  const activeIcon = icon || iconMap[variant]

  return (
    <div
      className={`alert alert-${variant} d-flex align-items-center rounded-3 p-3 ${className}`}
      role="alert"
    >
      {activeIcon && (
        <i className={`bi bi-${activeIcon} fs-5 me-3 flex-shrink-0`} aria-hidden="true" />
      )}
      <div className="flex-grow-1">{children}</div>
      {dismissible && (
        <button
          type="button"
          className="btn-close ms-2"
          aria-label="Close"
          onClick={onDismiss}
        />
      )}
    </div>
  )
}
