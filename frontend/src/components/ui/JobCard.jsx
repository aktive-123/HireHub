import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Badge from './Badge'
import Reveal from './Reveal'
import { formatSalaryAmount, formatSalaryPeriod, getEmploymentBadge } from '../../utils/jobs'
import { useAuth } from '../../context/AuthContext'
import { useSavedJobs } from '../../context/SavedJobsContext'

/*
 * Badge colour system (formal) — keep consistent across every card:
 *   - Amber/accent  = Featured / highlighted status   [job.is_featured]
 *   - primary blue  = Employment type (via getEmploymentBadge)
 *   - gray outline  = Experience level (secondary + outline)
 *   - neutral soft  = tags/skills (hh-badge-soft)
 * Green is not used for badges (see utils/jobs.js).
 */

export default function JobCard({ job, index = 0, featured = false }) {
  const [bouncing, setBouncing] = useState(false)
  const { user, role } = useAuth()
  const { isSaved, toggleSave } = useSavedJobs()
  const navigate = useNavigate()
  const badge = getEmploymentBadge(job)
  const saved = isSaved(job.id)

  const toggleSaved = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/jobs/${job.slug ?? job.id}` } })
      return
    }
    if (role !== 'seeker') return
    setBouncing(true)
    try {
      await toggleSave(job.id, !saved)
    } catch {
      // Keep UI state unchanged on failure.
    } finally {
      window.setTimeout(() => setBouncing(false), 260)
    }
  }

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
                  <Badge variant="primary" sm icon="patch-check-fill">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className={`hh-job-bookmark-btn ${saved ? 'is-active' : ''}`}
            onClick={toggleSaved}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from saved jobs' : 'Save job'}
          >
            <i
              className={`bi ${saved ? 'bi-bookmark-fill' : 'bi-bookmark'} ${
                bouncing ? 'is-bouncing' : ''
              }`}
              aria-hidden="true"
            />
          </button>
        </div>

        <h3 className="hh-job-title">
          <Link to={`/jobs/${job.slug ?? job.id}`} className="hh-job-title-link">
            {job.title}
          </Link>
        </h3>

        <p className="hh-job-location">
          <i className="bi bi-geo-alt" aria-hidden="true" />
          {job.location} {job.workplace && job.workplace !== 'On-site' && ` · ${job.workplace}`}
        </p>

        <div className="hh-job-badges">
          {job.is_featured && (
            <Badge variant="accent" icon="star-fill">
              Featured
            </Badge>
          )}
          <Badge variant={badge.variant} icon={badge.icon}>
            {badge.label}
          </Badge>
          {job.level && (
            <Badge variant="secondary" outline>
              {job.level}
            </Badge>
          )}
        </div>

        <p className="hh-job-salary">
          <span className="hh-job-salary-amount">{formatSalaryAmount(job.salary)}</span>
          <span className="hh-job-pay-basis">{formatSalaryPeriod(job.salary)}</span>
        </p>

        <div className="hh-job-tags">
          {(job.tags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="hh-badge hh-badge-soft">
              {tag}
            </span>
          ))}
        </div>

        <div className="hh-job-card-footer">
          <Link
            to={`/jobs/${job.slug ?? job.id}`}
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