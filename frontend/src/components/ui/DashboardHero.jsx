import { Link } from 'react-router-dom'

export default function DashboardHero({
  eyebrow = 'WELCOME BACK,',
  title = 'Hello 👋',
  subtitle,
  cta,
  image,
  tagline,
}) {
  return (
    <section className="hh-welcome-hero">
      {tagline && (
        <p className="hh-welcome-tagline" aria-hidden="true">
          {tagline}
        </p>
      )}

      <div className="hh-welcome-hero-text">
        <span className="hh-welcome-eyebrow">{eyebrow}</span>
        <h1 className="hh-welcome-title">{title}</h1>
        {subtitle && <p className="hh-welcome-subtitle">{subtitle}</p>}
        {cta && (
          <Link to={cta.to} className="hh-btn hh-btn-white hh-btn-pill">
            {cta.icon && <i className={`bi bi-${cta.icon}`} aria-hidden="true" />}
            {cta.label}
          </Link>
        )}
      </div>

      {image && (
        <div className="hh-welcome-hero-visual" aria-hidden="true" role="presentation">
          <img src={image} alt="" className="hh-welcome-hero-img" loading="eager" />
        </div>
      )}
    </section>
  )
}