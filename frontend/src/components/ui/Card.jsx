export default function Card({
  elevated = false,
  interactive = false,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'hh-card',
    elevated && 'hh-card-elevated',
    interactive && 'hh-card-interactive',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
