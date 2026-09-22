import Reveal from './Reveal'

// Shared page header for every dashboard page. `variant="admin"` renders the
// gradient hero band used across the console; the default variant is the flat
// employer-style header. `action` is any right-aligned content (buttons).
export default function PageHeader({
  eyebrow = 'DASHBOARD',
  title,
  subtitle,
  action,
  variant = 'default',
  className = '',
}) {
  const isAdmin = variant === 'admin'

  return (
    <Reveal>
      <div
        className={`${isAdmin ? 'hh-admin-page-hero' : 'hh-page-header'} ${className}`.trim()}
      >
        <div className={isAdmin ? 'hh-admin-page-hero-text' : 'hh-page-header-text'}>
          <span
            className={`hh-section-eyebrow ${isAdmin ? 'hh-section-eyebrow--admin' : ''} hh-mb-2`}
          >
            {eyebrow}
          </span>
          <h1 className={isAdmin ? 'hh-admin-page-title' : 'hh-page-title'}>{title}</h1>
          {subtitle && (
            <p className={isAdmin ? 'hh-admin-page-subtitle' : 'hh-page-subtitle'}>{subtitle}</p>
          )}
        </div>
        {action && (
          <div className={isAdmin ? 'hh-admin-page-hero-action' : 'hh-page-header-actions'}>
            {action}
          </div>
        )}
      </div>
    </Reveal>
  )
}