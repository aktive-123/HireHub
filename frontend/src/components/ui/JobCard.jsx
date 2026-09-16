import { useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from './Badge'
import Reveal from './Reveal'

function formatSalary(salary) {
  if (!salary) return ''
  const fmt = (n) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: salary.currency || 'USD',
      maximumFractionDigits: 0,
    }).format(n)
  return `${fmt(salary.min)} - ${fmt(salary.max)} ${salary.period ? ` / ${salary.period}` : ''}`
}

function employmentBadge(job) {
  const map = {
    'Full-time': { variant: 'success', icon: 'clock' },
    'Part-time': { variant: 'info', icon: 'clock-history' },
    Contract: { variant: 'warning', icon: 'file-earmark-text' },
    Internship: { variant: 'secondary', icon: 'mortarboard' },
    Remote: { variant: 'primary', icon: 'laptop' },
  }
  const key = job.employment_type || job.workplace || 'Full-time'
  const cfg = map[key] || map['Full-time']
  return { label: key, ...cfg }
}

export default function JobCard({ job, index = 0, featured = false }) {
  const [saved, setSaved] = useState(false)
  const badge = employmentBadge(job)

  return (
    <Reveal delay={index * 80}>
      <article className="hh-job-card hh-h-100">
        <div className="hh-job-card-header">
          <div className="hh-job-company-group">
            <div
              className="hh-job-company-logo"
              style={{
                background: job.company?.logoBg || 'var(--hh-bg-soft)',
                color: job.company?.logoColor || 'var(--hh-primary)',
              }}
            >
              {job.company?.logoText || job.company?.name?.charAt(0) || 'H'}
            </div>
            <div>
              <div className="hh-job-company-name">
                {job.company?.name}
                {job.company?.verified && (
                  <Badge variant="primary" sm icon="patch-check-fill" label="Verified" />
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className={`hh-job-bookmark-btn ${saved ? 'is-active' : ''}`}
            onClick={() => setSaved((p) => !p)}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from saved jobs' : 'Save job'}
          >
            <i className={`bi ${saved ? 'bi-bookmark-fill' : 'bi-bookmark'}`} aria-hidden="true" />
          </button>
        </div>

        <h3 className="hh-job-title">
          <Link to={`/jobs/${job.id}`} className="hh-job-title-link">
            {job.title}
          </Link>
        </h3>

        <p className="hh-job-location">
          <i className="bi bi-geo-alt" aria-hidden="true" />
          {job.location} {job.workplace && job.workplace !== 'On-site' && ` · ${job.workplace}`}
        </p>

        <div className="hh-job-badges">
          <Badge variant={badge.variant} icon={badge.icon}>
            {badge.label}
          </Badge>
          {job.level && (
            <Badge variant="secondary" outline>
              {job.level}
            </Badge>
          )}
        </div>

        <p className="hh-job-salary">{formatSalary(job.salary)}</p>

        <div className="hh-job-tags">
          {(job.tags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="hh-badge hh-badge-soft">
              {tag}
            </span>
          ))}
        </div>

        <div className="hh-job-card-footer">
          <Link
            to={`/jobs/${job.id}`}
            className="hh-btn hh-btn-primary hh-btn-sm hh-btn-pill"
          >
            {featured ? 'Apply Now' : 'View Details'}
          </Link>
          <span className="hh-job-posted">
            {job.posted_days_ago === 0
              ? 'Today'
              : job.posted_days_ago === 1
                ? '1 day ago'
                : `${job.posted_days_ago} days ago`}
          </span>
        </div>
      </article>
    </Reveal>
  )
}
