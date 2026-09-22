import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { jobsApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import JobCard from '../../components/ui/JobCard'
import Reveal from '../../components/ui/Reveal'
import EmptyState from '../../components/ui/EmptyState'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import {
  formatSalaryAmount,
  formatSalaryPeriod,
  getEmploymentBadge,
} from '../../utils/jobs'
import PageHero from '../../components/ui/PageHero'
import heroSlide1 from '../../assets/findjob.webp'
import heroSlide2 from '../../assets/findjob2.jpg'
import heroSlide3 from '../../assets/findjob3.jpg'
import heroSlide4 from '../../assets/findjob4.jpg'

const heroSlides = [heroSlide1, heroSlide2, heroSlide3, heroSlide4]

export default function JobDetailsPage() {
  const { id } = useParams()
  const { data, loading, error } = useApiData(
    () =>
      jobsApi.list().then((r) => {
        const items = r.items
        const job = items.find((j) => j.slug === id)
        if (!job) return { job: null, related: [] }
        const related = items
          .filter((j) => j.id !== job.id && (j.category === job.category || j.company?.id === job.company?.id))
          .slice(0, 3)
        const fallbackRelated =
          related.length === 0 ? items.filter((j) => j.id !== job.id).slice(0, 3) : related
        return { job, related: fallbackRelated }
      }),
    [id]
  )
  const job = data?.job
  const related = data?.related ?? []
  const [applied, setApplied] = useState(false)
  const [saved, setSaved] = useState(false)

  if (loading) {
    return (
      <section className="page-container hh-py-6">
        <div className="hh-loading-block">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          Loading job…
        </div>
      </section>
    )
  }

  if (!job) {
    return (
      <section className="page-container">
        <EmptyState
          icon={error ? 'wifi-off' : 'search'}
          title={error ? 'Could not load job' : 'Job not found'}
          text={error ? 'There was a problem connecting to the job board.' : 'This job listing may have expired or been removed.'}
          action={<Button to="/jobs" variant="primary">Browse all jobs</Button>}
        />
      </section>
    )
  }

  const badge = getEmploymentBadge(job)
  const company = job.company
  const posted =
    job.posted_days_ago === 0
      ? 'Today'
      : job.posted_days_ago === 1
        ? '1 day ago'
        : `${job.posted_days_ago} days ago`

  return (
    <>
      <PageHero images={heroSlides}>
        <div className="hh-mb-4">
          <Link to="/jobs" className="hh-btn hh-btn-outline-white hh-btn-sm hh-btn-pill">
            <i className="bi bi-arrow-left" aria-hidden="true" />
            Back to jobs
          </Link>
        </div>

        <Reveal>
          <div className="hh-detail-title-row hh-mb-3">
            <div
              className="hh-company-detail-logo"
              style={{
                background: company.logoBg || '#ffffff',
                color: company.logoColor || 'var(--hh-primary)',
              }}
              aria-hidden="true"
            >
              {company.logoText || company.name.charAt(0)}
            </div>
            <div>
              <div className="hh-company-meta hh-on-dark-muted">
                {company.name}
                {company.verified && (
                  <i
                    className="bi bi-patch-check-fill ms-2 hh-on-dark-accent"
                    aria-label="Verified company"
                  />
                )}
              </div>
              <h1 className="hh-page-hero-title hh-mb-2">{job.title}</h1>
              <div className="hh-toolbar">
                <Badge variant={badge.variant} dot>
                  {badge.label}
                </Badge>
                {job.level && <Badge variant="secondary">{job.level}</Badge>}
                {job.workplace && (
                  <span className="hh-small hh-on-dark-muted">
                    <i className="bi bi-geo-alt me-1" aria-hidden="true" />
                    {job.location} · {job.workplace}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </PageHero>

      <section className="hh-section-space bg-white">
        <div className="page-container">
          <div className="hh-detail-grid">
            {/* Main content */}
            <div>
              {applied && (
                <Alert
                  variant="success"
                  className="hh-mb-5"
                  dismissible
                  onDismiss={() => setApplied(false)}
                >
                  Application submitted for <strong>{job.title}</strong> at {company.name}. You can
                  track its status in your candidate dashboard.
                </Alert>
              )}

              <DetailCard title="About this role" icon="file-text">
                <p>{job.description}</p>
              </DetailCard>

              <DetailCard title="Responsibilities" icon="check2-circle">
                <ul className="hh-list-checks">
                  {job.responsibilities.map((item) => (
                    <li key={item}>
                      <i className="bi bi-check-circle-fill" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </DetailCard>

              <DetailCard title="Requirements" icon="clipboard-check">
                <ul className="hh-list-checks">
                  {job.requirements.map((item) => (
                    <li key={item}>
                      <i className="bi bi-check-circle-fill" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </DetailCard>

              {job.tags && job.tags.length > 0 && (
                <DetailCard title="Skills" icon="gear">
                  <div className="hh-chip-row">
                    {job.tags.map((tag) => (
                      <span className="hh-chip" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </DetailCard>
              )}

              <DetailCard title="Benefits" icon="shield-check">
                <ul className="hh-benefit-list">
                  {job.benefits.map((benefit) => (
                    <li key={benefit}>
                      <i className="bi bi-check-circle-fill" aria-hidden="true" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </DetailCard>
            </div>

            {/* Sidebar */}
            <div className="hh-sticky-sidebar">
              <div className="hh-sidebar-card">
                <h3>
                  <span className="hh-detail-card-icon" aria-hidden="true">
                    <i className="bi bi-info-circle" />
                  </span>
                  Job details
                </h3>
                <ul className="hh-meta-list hh-mb-4">
                  <li>
                    <i className="bi bi-briefcase" aria-hidden="true" />
                    <span>Employment: </span>
                    {job.employment_type}
                  </li>
                  <li>
                    <i className="bi bi-geo-alt" aria-hidden="true" />
                    <span>Location: </span>
                    {job.location}
                  </li>
                  <li>
                    <i className="bi bi-laptop" aria-hidden="true" />
                    <span>Workplace: </span>
                    {job.workplace}
                  </li>
                  <li>
                    <i className="bi bi-bar-chart" aria-hidden="true" />
                    <span>Level: </span>
                    {job.level}
                  </li>
                  <li>
                    <i className="bi bi-cash-stack" aria-hidden="true" />
                    <span>Salary: </span>
                    {job.salary
                      ? `${formatSalaryAmount(job.salary)} · ${formatSalaryPeriod(job.salary)}`
                      : 'Competitive'}
                  </li>
                  <li>
                    <i className="bi bi-clock" aria-hidden="true" />
                    <span>Posted: </span>
                    {posted}
                  </li>
                  <li>
                    <i className="bi bi-people" aria-hidden="true" />
                    <span>Applicants: </span>
                    {job.applications_count}
                  </li>
                </ul>

                <Button
                  block
                  size="lg"
                  pill
                  className="hh-mb-3"
                  onClick={() => setApplied(true)}
                >
                  {applied ? (
                    <>
                      <i className="bi bi-check-lg" aria-hidden="true" />
                      Applied
                    </>
                  ) : (
                    'Apply Now'
                  )}
                </Button>
                <Button
                  block
                  variant={saved ? 'primary' : 'outline'}
                  pill
                  onClick={() => setSaved((s) => !s)}
                  icon={saved ? 'bookmark-check-fill' : 'bookmark'}
                >
                  {saved ? 'Saved' : 'Save Job'}
                </Button>
              </div>

              <div className="hh-sidebar-card">
                <h3>
                  <span className="hh-detail-card-icon" aria-hidden="true">
                    <i className="bi bi-buildings" />
                  </span>
                  About the company
                </h3>
                <div className="hh-detail-title-row">
                  <div
                    className="hh-company-logo"
                    style={{
                      background: company.logoBg || 'var(--hh-bg-soft)',
                      color: company.logoColor || 'var(--hh-primary)',
                    }}
                    aria-hidden="true"
                  >
                    {company.logoText || company.name.charAt(0)}
                  </div>
                  <div>
                    <strong className="hh-company-name">{company.name}</strong>
                    <p className="hh-company-meta hh-mb-0">
                      Verified employer
                      <i
                        className="bi bi-patch-check-fill text-primary ms-1"
                        aria-label="Verified"
                      />
                    </p>
                  </div>
                </div>
                <p className="hh-small hh-text-muted hh-mt-3 hh-mb-4">
                  {company.verified ? 'Verified employer on HireHub.' : 'Employer on HireHub.'}
                </p>
                <Link
                  to={`/companies/${company.slug}`}
                  className="hh-btn hh-btn-outline-primary hh-btn-sm hh-btn-pill hh-btn-block"
                >
                  View company profile
                </Link>
              </div>
            </div>
          </div>

          {/* Related jobs */}
          {related.length > 0 && (
            <div className="hh-mt-5">
              <Reveal>
                <div className="hh-toolbar hh-toolbar-between hh-mb-4">
                  <SectionHeadingTitle>You might also like</SectionHeadingTitle>
                  <Link to="/jobs" className="hh-btn hh-btn-outline-primary hh-btn-sm hh-btn-pill">
                    View all jobs
                    <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
                  </Link>
                </div>
              </Reveal>
              <div className="row g-4">
                {related.map((r, index) => (
                  <div className="col-12 col-md-6 col-lg-4" key={r.id}>
                    <JobCard job={r} index={index} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function SectionHeadingTitle({ children }) {
  return <h2 className="hh-section-title mb-0">{children}</h2>
}

function DetailCard({ title, icon, children }) {
  return (
    <Reveal>
      <div className="hh-detail-card hh-mb-4">
        <h2>
          {icon && (
            <span className="hh-detail-card-icon" aria-hidden="true">
              <i className={`bi bi-${icon}`} />
            </span>
          )}
          {title}
        </h2>
        {children}
      </div>
    </Reveal>
  )
}