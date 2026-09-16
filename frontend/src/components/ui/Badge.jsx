const VARIANTS = {
  primary: 'hh-badge-primary',
  secondary: 'hh-badge-secondary',
  accent: 'hh-badge-accent',
  success: 'hh-badge-success',
  danger: 'hh-badge-danger',
  warning: 'hh-badge-warning',
  info: 'hh-badge-info',
}

export default function Badge({
  variant = 'primary',
  icon,
  sm,
  outline,
  dot,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'hh-badge',
    VARIANTS[variant],
    sm && 'hh-badge-sm',
    outline && 'hh-badge-outline',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} {...rest}>
      {dot && (
        <span
          className="hh-badge-dot"
          aria-hidden="true"
        />
      )}
      {icon && <i className={`bi bi-${icon}`} aria-hidden="true" />}
      {children}
    </span>
  )
}