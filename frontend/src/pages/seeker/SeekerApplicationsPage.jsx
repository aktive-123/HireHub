import { useMemo, useState } from 'react'
import { publicJobs } from '../../data/jobs'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const PAGE_SIZE = 6

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'applied', label: 'Applied' },
  { value: 'under-review', label: 'Under Review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
]

const STATUS_VARIANT = {
  applied: 'secondary',
  'under-review': 'info',
  shortlisted: 'primary',
  interview: 'warning',
  offer: 'accent',
  hired: 'success',
  rejected: 'danger',
}

const SAMPLE_APPLICATIONS = [
  { id: 'ap-1', jobId: 'job-1', applied: 'Sep 12', status: 'under-review' },
  { id: 'ap-2', jobId: 'job-5', applied: 'Sep 10', status: 'shortlisted' },
  { id: 'ap-3', jobId: 'job-3', applied: 'Sep 4', status: 'interview' },
  { id: 'ap-4', jobId: 'job-6', applied: 'Aug 28', status: 'applied' },
  { id: 'ap-5', jobId: 'job-4', applied: 'Aug 22', status: 'rejected' },
  { id: 'ap-6', jobId: 'job-2', applied: 'Aug 15', status: 'offer' },
  { id: 'ap-7', jobId: 'job-7', applied: 'Aug 8', status: 'hired' },
  { id: 'ap-8', jobId: 'job-8', applied: 'Jul 30', status: 'shortlisted' },
  { id: 'ap-9', jobId: 'job-3', applied: 'Jul 19', status: 'applied' },
]

export default function SeekerApplicationsPage() {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)

  const applications = useMemo(
    () =>
      SAMPLE_APPLICATIONS.map((app) => {
        const job = publicJobs.find((j) => j.id === app.jobId)
        return job ? { ...app, job } : null
      }).filter(Boolean),
    []
  )

  const filtered = useMemo(
    () => (filter === 'all' ? applications : applications.filter((a) => a.status === filter)),
    [applications, filter]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <SectionHeading
              eyebrow="JOB SEEKER DASHBOARD"
              title="My applications"
              subtitle="Track the status of every role you've applied for."
            />
          </Reveal>

          <div className="hh-tabs hh-mb-4" role="tablist" aria-label="Filter by application status">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                className={`hh-tab ${filter === value ? 'is-active' : ''}`}
                onClick={() => { setFilter(value); setPage(1) }}
              >
                {label}
                {value !== 'all' && (
                  <span className="hh-btn-badge ms-1">
                    {applications.filter((a) => a.status === value).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <Reveal>
            {visible.length > 0 ? (
              <Card className="hh-card-body">
                {visible.map(({ id, job, applied, status }) => (
                  <div className="hh-app-row" key={id}>
                    <div
                      className="hh-app-logo"
                      style={{
                        background: job.company?.logoBg || 'var(--hh-bg-soft)',
                        color: job.company?.logoColor || 'var(--hh-primary)',
                      }}
                    >
                      {job.company?.logoText || job.company?.name?.charAt(0)}
                    </div>
                    <div className="hh-app-info">
                      <span className="hh-app-title">{job.title}</span>
                      <div className="hh-app-company">{job.company?.name}</div>
                      <div className="hh-app-meta">
                        <span><i className="bi bi-geo-alt hh-me-1" aria-hidden="true" />{job.location}</span>
                        <span><i className="bi bi-clock hh-me-1" aria-hidden="true" />Applied {applied}</span>
                      </div>
                    </div>
                    <div className="hh-app-action">
                      <Badge variant={STATUS_VARIANT[status] || 'secondary'}>
                        {status.replace('-', ' ')}
                      </Badge>
                      <Button to={`/seeker/applications/${job.id}`} variant="outline-primary" size="sm">
                        View application
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>
            ) : (
              <EmptyState
                icon="inbox"
                title="No applications here"
                text="Try a different status filter, or browse jobs to apply to new roles."
                action={
                  <Button to="/seeker/browse-jobs" variant="primary" pill>Browse jobs</Button>
                }
              />
            )}
          </Reveal>

          {totalPages > 1 && (
            <div className="hh-mt-4">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      </section>
    </>
  )
}