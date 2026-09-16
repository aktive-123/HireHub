import { Link } from 'react-router-dom'

const VARIANTS = {
  primary: 'hh-btn-primary',
  secondary: 'hh-btn-secondary',
  outline: 'hh-btn-outline-primary',
  'outline-white': 'hh-btn-outline-white',
  ghost: 'hh-btn-ghost',
  white: 'hh-btn-white',
  light: 'hh-btn-light',
}

const SIZES = {
  sm: 'hh-btn-sm',
  lg: 'hh-btn-lg',
}

export default function Button({
  variant = 'primary',
  size,
  pill,
  block,
  icon,
  iconPosition = 'left',
  href,
  to,
  children,
  className = '',
  disabled = false,
  ...rest
}) {
  const classes = [
    'hh-btn',
    VARIANTS[variant],
    size && SIZES[size],
    pill && 'hh-btn-pill',
    block && 'hh-btn-block',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const iconEl = icon ? <i className={`bi bi-${icon}`} aria-hidden="true" /> : null

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {iconPosition === 'left' && iconEl}
        {children}
        {iconPosition === 'right' && iconEl}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {iconPosition === 'left' && iconEl}
        {children}
        {iconPosition === 'right' && iconEl}
      </a>
    )
  }

  return (
    <button className={classes} disabled={disabled} type="button" {...rest}>
      {iconPosition === 'left' && iconEl}
      {children}
      {iconPosition === 'right' && iconEl}
    </button>
  )
}