import { Link } from 'react-router-dom'
import Badge from './Badge'
import Reveal from './Reveal'

export default function CompanyCard({ company, index = 0 }) {
  return (
    <Reveal delay={index * 80}>
      <article className="hh-card hh-card-hover hh-company-card hh-h-100">
        <div className="hh-company-card-header">
          <div
            className="hh-company-logo"
            style={{
              background: company.logoBg || 'var(--hh-bg-soft)',
              color: company.logoColor || 'var(--hh-primary)',
            }}
          >
            {company.logoText || company.name.charAt(0)}
          </div>
          <div className="hh-company-card-title-group">
            <h3 className="hh-company-name">
              {company.name}
              {company.is_verified && (
                <Badge variant="primary" sm icon="patch-check-fill" label="Verified" />
              )}
            </h3>
            <p className="hh-company-meta">
              {company.industry} · {company.location}
            </p>
          </div>
        </div>

        <p className="hh-company-tagline">
          {company.tagline || company.description}
        </p>

        <div className="hh-company-stats">
          <div className="hh-company-stat">
            <span className="hh-company-stat-value">{company.rating ?? '—'}</span>
            <span className="hh-company-stat-label">Rating</span>
            <span className="hh-company-stars" aria-hidden="true">
              <i className="bi bi-star-fill" />
            </span>
          </div>
          <div className="hh-company-stat">
            <span className="hh-company-stat-value">{company.reviews_count ?? 0}</span>
            <span className="hh-company-stat-label">Reviews</span>
          </div>
          <div className="hh-company-stat">
            <span className="hh-company-stat-value">{company.open_jobs_count ?? 0}</span>
            <span className="hh-company-stat-label">Open Jobs</span>
          </div>
        </div>

        <div className="hh-company-card-footer">
          <Link
            to={`/companies/${company.id}`}
            className="hh-btn hh-btn-outline-primary hh-btn-sm hh-btn-pill"
          >
            View Profile
          </Link>
          {company.is_featured && (
            <Badge variant="warning" sm icon="lightning-fill" label="Featured" />
          )}
        </div>
      </article>
    </Reveal>
  )
}
