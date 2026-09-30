import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import { interviewApi } from '../../services/api'

const PAGE_SIZE = 6
const STATUS_FILTERS = ['all', 'pending', 'scheduled', 'confirmed', 'completed', 'cancelled']

const MODE_ICON = {
  video: 'camera-video',
  phone: 'telephone',
  in_person: 'geo-alt',
}

/**
 * The seeker's view of their own interviews.
 *
 * Read only by design: the employer who booked the interview owns its schedule
 * and status, so this screen offers no reschedule or cancel. A candidate who
 * needs a different time has to ask, and pretending otherwise would let two
 * sides of the same booking disagree about when it is happening.
 */
export default function SeekerInterviewsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let active = true

    interviewApi
      .seekerList()
      .then((res) => {
        if (active) setItems(res.items ?? [])
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Could not load your interviews. Please try again.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => item.status === filter)),
    [items, filter],
  )

  // A filter change can leave the current page beyond the end of the results.
  useEffect(() => {
    setPage(1)
  }, [filter])

  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const nextInterview = items
    .filter((item) => ['pending', 'scheduled', 'confirmed'].includes(item.status))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0]

  if (loading) {
    return (
      <>
        <PageHeader title="My Interviews" subtitle="Everything you have been invited to." />
        <LoadingState label="Loading your interviews…" />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="My Interviews"
        subtitle="Everything you have been invited to, with the details you need to join."
        eyebrow="Interviews"
      />

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {nextInterview && (
        <Card className="mb-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <div className="text-muted small mb-1">Up next</div>
              <h2 className="h5 mb-1">{nextInterview.role ?? 'Interview'}</h2>
              <div className="text-muted small">
                {nextInterview.when} · {nextInterview.duration_minutes} minutes
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <StatusBadge status={nextInterview.status} label={nextInterview.status_label} />
              {nextInterview.link && (
                <Button
                  href={nextInterview.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                  pill
                  icon={MODE_ICON[nextInterview.mode] ?? 'camera-video'}
                >
                  Join
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="d-flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Filter interviews">
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            className={`btn btn-sm ${filter === value ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setFilter(value)}
          >
            {value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="calendar-check"
          title="No interviews yet"
          text="When an employer invites you to interview, it will appear here with the time and joining details."
        />
      ) : (
        <>
          <div className="row g-3">
            {visible.map((item) => (
              <div key={item.id} className="col-12 col-lg-6">
                <Card className="h-100">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                    <div>
                      <h2 className="h6 mb-1">{item.role ?? 'Interview'}</h2>
                      {item.job?.slug ? (
                        <Link to={`/jobs/${item.job.slug}`} className="small">
                          View the job
                        </Link>
                      ) : null}
                    </div>
                    <StatusBadge status={item.status} label={item.status_label} />
                  </div>

                  <dl className="mb-3 small mb-0">
                    <div className="d-flex justify-content-between py-1">
                      <dt className="text-muted fw-normal">When</dt>
                      <dd className="mb-0 text-end">{item.when ?? 'To be confirmed'}</dd>
                    </div>
                    <div className="d-flex justify-content-between py-1">
                      <dt className="text-muted fw-normal">Format</dt>
                      <dd className="mb-0 text-end text-capitalize">
                        {(item.mode ?? 'video').replace('_', ' ')}
                      </dd>
                    </div>
                    <div className="d-flex justify-content-between py-1">
                      <dt className="text-muted fw-normal">Length</dt>
                      <dd className="mb-0 text-end">{item.duration_minutes} minutes</dd>
                    </div>
                    {item.location && (
                      <div className="d-flex justify-content-between py-1">
                        <dt className="text-muted fw-normal">Where</dt>
                        <dd className="mb-0 text-end">{item.location}</dd>
                      </div>
                    )}
                  </dl>

                  {item.notes && (
                    <p className="small text-muted border-top pt-3 mb-0">{item.notes}</p>
                  )}

                  {item.link && ['scheduled', 'confirmed'].includes(item.status) && (
                    <Button
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="sm"
                      pill
                      block
                      className="mt-3"
                      icon={MODE_ICON[item.mode] ?? 'camera-video'}
                    >
                      Join {item.status === 'confirmed' ? 'Call' : 'Session'}
                    </Button>
                  )}
                </Card>
              </div>
            ))}
          </div>

          {lastPage > 1 && (
            <nav className="d-flex justify-content-between align-items-center mt-4">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="small text-muted">
                Page {page} of {lastPage}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}
    </>
  )
}
