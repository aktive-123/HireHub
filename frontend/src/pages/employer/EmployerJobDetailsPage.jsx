import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPublicJobById } from '../../data/jobs'
import { applicants, STATUS_VARIANT } from '../../data/applicants'
import { formatSalaryAmount, formatSalaryPeriod, getEmploymentBadge } from '../../utils/jobs'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const PAGE_SIZE = 6

export default function EmployerJobDetailsPage() {
  const { id } = useParams()
  const job = getPublicJobById(id)

  const [tab, setTab] = useState('all')
  const [page, setPage] = useState(1)

  const jobApplicants = useMemo(
    () => applicants.filter((a) => a.job === (job ? job.title : '')).map((a) => ({ ...a })),
    [job]
  )

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
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
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
          <Reveal>
            <div className="hh-toolbar hh-toolbar-between hh-mb-4">
              <SectionHeading
                eyebrow="EMPLOYER"
                title={job.title}
                subtitle="Manage this posting and review its applicants."
              />
              <div className="d-flex flex-wrap gap-2">
                <Link to={`/employer/jobs/${job.id}/edit`}>
                  <Button variant="outline-primary" icon="bi-pencil">Edit job</Button>
                </Link>
                <Link to={`/jobs/${job.id}`}>
                  <Button variant="primary" icon="bi-box-arrow-up-right">View on site</Button>
                </Link>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="d-flex align-items-center gap-2 flex-wrap hh-mb-4">
              <Badge variant="success" dot>{job.status || 'open'}</Badge>
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
                          <Badge variant={STATUS_VARIANT[a.status] || 'secondary'}>{a.status}</Badge>
                          <Link to={`/employer/applicants/${a.id}`}>
                            <Button variant="outline-primary" size="sm">Review</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                    {totalPages > 1 && (
                      <div className="hh-mt-4">
                        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                      </div>
                    )}
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
                  <Link to={`/employer/jobs/${job.id}/edit`}><i className="bi bi-pencil hh-me-2" />Edit posting</Link>
                </nav>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}