import { useMemo, useState } from 'react'
import { seekerApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import Pagination from '../../components/ui/Pagination'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const PAGE_SIZE = 6

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Under Review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
]

const STATUS_VARIANT = {
  new: 'secondary',
  reviewing: 'info',
  'under-review': 'info',
  shortlisted: 'primary',
  interview: 'warning',
  offer: 'accent',
  hired: 'success',
  rejected: 'danger',
  withdrawn: 'secondary',
}

function normalizeApp(app) {
  return {
    id: String(app.id).replace(/^app-/, ''),
    applied: app.applied,
    status: app.status,
    job: {
      id: app.job_id,
      slug: app.job_slug,
      title: app.job,
      location: app.location,
      company:
        typeof app.company === 'string' ? { name: app.company } : (app.company ?? {}),
    },
  }
}

export default function SeekerApplicationsPage() {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)

  const { data, loading, error, reload } = useApiData(
    () => seekerApi.applications(filter === 'all' ? {} : { status: filter }),
    [filter]
  )

  const applications = useMemo(() => (data ?? []).map(normalizeApp), [data])

  const filtered = useMemo(
    () => (filter === 'all' ? applications : applications.filter((a) => a.status === filter)),
    [applications, filter]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <LoadingState text="Loading your applications…" />
          </Reveal>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <EmptyState
              icon="exclamation-triangle"
              title="Couldn't load your applications"
              text="Something went wrong while fetching your applications. Please try again."
              action={
                <button type="button" className="hh-btn hh-btn-outline-primary hh-btn-pill" onClick={() => reload()}>
                  Try again
                </button>
              }
            />
          </Reveal>
        </div>
      </section>
    )
  }

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
                      <Button to={`/seeker/applications/${id}`} variant="outline-primary" size="sm">
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