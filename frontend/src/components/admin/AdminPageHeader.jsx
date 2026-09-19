import Reveal from '../ui/Reveal'

export default function AdminPageHeader({
  eyebrow = 'ADMIN CONSOLE',
  title,
  subtitle,
  action,
}) {
  return (
    <Reveal>
      <div className="hh-admin-page-hero hh-mb-4">
        <div className="hh-admin-page-hero-text">
          <span className="hh-welcome-eyebrow">{eyebrow}</span>
          <h1 className="hh-admin-page-title">{title}</h1>
          {subtitle && <p className="hh-admin-page-subtitle">{subtitle}</p>}
        </div>
        {action && <div className="hh-admin-page-hero-action">{action}</div>}
      </div>
    </Reveal>
  )
}