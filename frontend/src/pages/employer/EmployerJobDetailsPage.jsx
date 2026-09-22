import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { employerApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import { formatSalaryAmount, formatSalaryPeriod, getEmploymentBadge } from '../../utils/jobs'
import PageHeader from '../../components/ui/PageHeader'
import Reveal from '../../components/ui/Reveal'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import TablePagination from '../../components/ui/TablePagination'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import LoadingState from '../../components/ui/LoadingState'

const PAGE_SIZE = 6

const EMPLOYMENT_LABELS = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  remote: 'Remote',
}

function daysFromPosted(postedAt) {
  if (!postedAt) return 0
  const date = new Date(postedAt)
  if (Number.isNaN(date.getTime())) return 0
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000))
}

function normalizeJob(job) {
  const employmentKey = String(job.employment_type ?? job.type ?? '').toLowerCase()
  return {
    ...job,
    company: typeof job.company === 'string' ? { name: job.company } : (job.company ?? {}),
    applications_count: job.applications ?? job.applications_count,
    employment_type: EMPLOYMENT_LABELS[employmentKey] || job.employment_type || job.type || undefined,
    salary: job.salary ?? {
      min: job.salary_min,
      max: job.salary_max,
      currency: job.salary_currency,
      period: job.salary_period,
    },
    posted_days_ago: job.posted_days_ago ?? daysFromPosted(job.posted_at),
  }
}

export default function EmployerJobDetailsPage() {
  const { id } = useParams()

  const [tab, setTab] = useState('all')
  const [page, setPage] = useState(1)

  const jobsFetch = useApiData(() => employerApi.jobs(), [])
  const applicantsFetch = useApiData(() => employerApi.applicants(), [])

  const job = useMemo(
    () => {
      const found = (jobsFetch.data?.items ?? []).find((item) => item.slug === id || item.id === id)
      return found ? normalizeJob(found) : null
    },
    [jobsFetch.data, id]
  )

  const jobApplicants = useMemo(
    () =>
      (applicantsFetch.data ?? [])
        .filter((a) => a.job_slug === (job?.slug ?? id) || a.job === (job?.title ?? ''))
        .map((a) => ({ ...a })),
    [applicantsFetch.data, job, id]
  )

  if (jobsFetch.loading || applicantsFetch.loading) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <LoadingState text="Loading job details…" />
          </Reveal>
        </div>
      </section>
    )
  }

  if (jobsFetch.error || applicantsFetch.error) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <EmptyState
              icon="exclamation-triangle"
              title="Couldn't load this job"
              text="Something went wrong while fetching this posting. Please try again."
              action={
                <button type="button" className="hh-btn hh-btn-outline-primary hh-btn-pill" onClick={() => jobsFetch.reload()}>
                  Try again
                </button>
              }
            />
          </Reveal>
        </div>
      </section>
    )
  }

  if (!job) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <EmptyState icon="briefcase" title="Job not found" text="This posting may have been removed or the link is incorrect." />
          <div className="text-center hh-mt-4">
            <Button to="/employer/jobs" variant="outline-primary">Back to my jobs</Button>
          </div>
        </div>
      </section>
    )
  }

  const tabs = [
    { key: 'all', label: `All (${jobApplicants.length})` },
    { key: 'new', label: `New (${jobApplicants.filter((a) => a.status === 'new').length})` },
    { key: 'shortlisted', label: `Shortlisted (${jobApplicants.filter((a) => a.status === 'shortlisted').length})` },
    { key: 'interview', label: `Interview (${jobApplicants.filter((a) => a.status === 'interview').length})` },
    { key: 'hired', label: `Hired (${jobApplicants.filter((a) => a.status === 'hired').length})` },
  ]

  const filtered = tab === 'all' ? jobApplicants : jobApplicants.filter((a) => a.status === tab)
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = [
    { key: 'views', label: 'Views', value: job.views || 0 },
    { key: 'applicants', label: 'Applicants', value: job.applications_count || jobApplicants.length },
    { key: 'shortlisted', label: 'Shortlisted', value: jobApplicants.filter((a) => a.status === 'shortlisted').length },
    { key: 'hired', label: 'Hired', value: jobApplicants.filter((a) => a.status === 'hired').length },
  ]

  const employment = getEmploymentBadge(job)

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
<PageHeader
          eyebrow="EMPLOYER"
          title={job.title}
          subtitle="Manage this posting and review its applicants."
          action={
            <div className="d-flex flex-wrap gap-2">
              <Link to={`/employer/jobs/${job.slug || job.id}/edit`}>
                <Button variant="outline-primary" icon="bi-pencil">Edit job</Button>
              </Link>
              <Link to={`/jobs/${job.slug || job.id}`}>
                <Button variant="primary" icon="bi-box-arrow-up-right">View on site</Button>
              </Link>
            </div>
          }
        />

        <Reveal>
          <div className="d-flex align-items-center gap-2 flex-wrap hh-mb-4">
            <StatusBadge status={job.status || 'open'} />
              <Badge variant={employment.variant} icon={employment.icon}>{employment.label}</Badge>
              <Badge variant="secondary">{job.level}</Badge>
              <span className="hh-small text-muted">
                {formatSalaryAmount(job.salary)} · {formatSalaryPeriod(job.salary)} · Posted {job.posted_days_ago} days ago
              </span>
            </div>
          </Reveal>

          <Reveal>
            <div className="hh-stat-band hh-mb-4">
              {stats.map((stat) => (
                <div className="hh-stat-tile" key={stat.key}>
                  <span className="hh-stat-tile-value">{stat.value}</span>
                  <span className="hh-stat-tile-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <div className="hh-tabs hh-mb-3" role="tablist" aria-label="Filter applicants">
                {tabs.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    className={`hh-tab ${tab === key ? 'is-active' : ''}`}
                    onClick={() => { setTab(key); setPage(1) }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <Card className="hh-card-body">
                {visible.length > 0 ? (
                  <>
                    {visible.map((a) => (
                      <div className="hh-activity-row" key={a.id}>
                        <div className="hh-activity-content">
                          <span className="hh-activity-title">{a.name}</span>
                          <span className="hh-activity-meta">{a.role} · Applied {a.applied} · {a.match}% match</span>
                        </div>
                        <div className="hh-app-action">
                          <StatusBadge status={a.status} />
                          <Link to={`/employer/applicants/${a.id}`}>
                            <Button variant="outline-primary" size="sm">Review</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                    <TablePagination
                      page={page}
                      pageSize={PAGE_SIZE}
                      total={filtered.length}
                      onPageChange={setPage}
                    />
                  </>
                ) : (
                  <EmptyState
                    icon="people"
                    title="No applicants in this stage"
                    text="Applications matching this filter will appear here."
                  />
                )}
              </Card>
            </div>

            <div className="col-12 col-lg-4">
              <Card className="hh-card-body hh-mb-4">
                <div className="hh-card-title-md hh-mb-3">Posting details</div>
                <ul className="hh-meta-list">
                  <li><i className="bi bi-geo-alt" aria-hidden="true" /><span>{job.location}</span></li>
                  <li><i className="bi bi-diagram-3" aria-hidden="true" /><span>{job.category || 'General'}</span></li>
                  <li><i className="bi bi-globe2" aria-hidden="true" /><span>{job.workplace}</span></li>
                  <li><i className="bi bi-cash-stack" aria-hidden="true" /><span>{formatSalaryAmount(job.salary)} / {formatSalaryPeriod(job.salary).toLowerCase()}</span></li>
                  <li><i className="bi bi-calendar3" aria-hidden="true" /><span>Posted {job.posted_days_ago} days ago</span></li>
                </ul>
              </Card>

              <Card className="hh-card-body">
                <div className="hh-card-title-md hh-mb-3">Quick links</div>
                <nav className="hh-vert-list">
                  <Link to="/employer/applicants"><i className="bi bi-people hh-me-2" />All applicants</Link>
                  <Link to="/employer/tracking"><i className="bi bi-kanban hh-me-2" />ATS pipeline</Link>
                  <Link to="/employer/jobs"><i className="bi bi-briefcase hh-me-2" />My job posts</Link>
                  <Link to={`/employer/jobs/${job.slug || job.id}/edit`}><i className="bi bi-pencil hh-me-2" />Edit posting</Link>
                </nav>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}