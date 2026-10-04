import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { seekerApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import PageHeader from '../../components/ui/PageHeader'
import Reveal from '../../components/ui/Reveal'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import Pagination from '../../components/ui/Pagination'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const PAGE_SIZE = 6

// `offer_confirmed_pending_acceptance` gets its own tab because it is the only
// status waiting on the seeker rather than on the employer. Burying it inside
// "All" behind an unlabelled badge is how an offer sits unread until it looks
// stale. "Closed" groups rejected and withdrawn, because to the seeker a
// declined offer and a rejected application are the same outcome.
const FILTERS = [
  { value: 'all', label: 'All', statuses: null },
  { value: 'new', label: 'New', statuses: ['new'] },
  { value: 'reviewing', label: 'Under Review', statuses: ['reviewing'] },
  { value: 'shortlisted', label: 'Shortlisted', statuses: ['shortlisted'] },
  { value: 'interview', label: 'Interview', statuses: ['interview'] },
  { value: 'offer_confirmed_pending_acceptance', label: 'Needs your answer', statuses: ['offer_confirmed_pending_acceptance'] },
  { value: 'hired', label: 'Hired', statuses: ['hired'] },
  { value: 'closed', label: 'Closed', statuses: ['rejected', 'withdrawn'] },
]

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
  const [searchParams, setSearchParams] = useSearchParams()

  // The tab lives in the URL so the dashboard's "Needs your answer" card can
  // deep-link into the offer queue, and so a refresh keeps the seeker on the
  // filter they were reading.
  const requested = searchParams.get('status')
  const activeValue = FILTERS.some((f) => f.value === requested && f.value !== 'all')
    ? requested
    : null
  const activeTab = activeValue ?? 'all'
  const filterLabel = FILTERS.find((f) => f.value === activeTab)?.label ?? 'All'
  const statusParam = activeValue
    ? FILTERS.find((f) => f.value === activeValue).statuses.join(',')
    : null

  const [page, setPage] = useState(1)

  const { data, loading, error, reload } = useApiData(
    () => seekerApi.applications(statusParam ? { status: statusParam } : {}),
    [statusParam]
  )

  const applications = useMemo(() => (data?.items ?? []).map(normalizeApp), [data])

  // Server already applied the status filter; this only guards the grouped
  // "Closed" tab so a mixed response still renders a single consistent list.
  const filtered = useMemo(() => {
    if (!activeValue) return applications
    const group = FILTERS.find((f) => f.value === activeValue)?.statuses ?? []
    return applications.filter((a) => group.includes(a.status))
  }, [applications, activeValue])

  const counts = useMemo(() => {
    const source = data?.statusCounts
    if (!source || Object.keys(source).length === 0) {
      // Older backend without status_counts: fall back to counting the rows we
      // happen to have, which is right on the "All" tab and undercounts others.
      return applications.reduce((acc, a) => {
        acc[a.status] = (acc[a.status] ?? 0) + 1
        return acc
      }, {})
    }
    return source
  }, [data?.statusCounts, applications])

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
          <PageHeader
            eyebrow="JOB SEEKER DASHBOARD"
            title="My applications"
            subtitle="Track the status of every role you've applied for."
          />

          <div className="hh-tabs hh-mb-4" role="tablist" aria-label="Filter by application status">
            {FILTERS.map(({ value, label, statuses: group }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={activeTab === value}
                className={`hh-tab ${activeTab === value ? 'is-active' : ''}`}
                onClick={() => {
                  setPage(1)
                  if (value === 'all') {
                    searchParams.delete('status')
                  } else {
                    searchParams.set('status', value)
                  }
                  setSearchParams(searchParams, { replace: true })
                }}
              >
                {label}
                {group && (
                  <span className="hh-btn-badge ms-1">
                    {group.reduce((sum, s) => sum + (Number(counts[s]) || 0), 0)}
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
                      {/* The canonical badge, not a local colour map: the raw
                          `status.replace('-', ' ')` this used to render produced
                          "offer confirmed pending acceptance" in a colour this
                          page invented, and nothing at all for a withdrawn
                          application. */}
                      <StatusBadge
                        status={status}
                        label={
                          status === 'offer_confirmed_pending_acceptance'
                            ? 'Awaiting your acceptance'
                            : undefined
                        }
                      />
                      <Button to={`/seeker/applications/${id}`} variant="outline" size="sm">
                        {status === 'offer_confirmed_pending_acceptance' ? 'Review offer' : 'View application'}
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>
            ) : (
              <EmptyState
                icon="inbox"
                title={activeTab === 'all' ? 'No applications here' : `Nothing in ${filterLabel.toLowerCase()}`}
                text={
                  activeTab === 'all'
                    ? "Try a different status filter, or browse jobs to apply to new roles."
                    : 'Try another status filter, or browse jobs to apply to new roles.'
                }
                action={
                  activeTab === 'all' ? (
                    <Button to="/seeker/browse-jobs" variant="primary" pill>Browse jobs</Button>
                  ) : (
                    <Button onClick={() => { searchParams.delete('status'); setSearchParams(searchParams, { replace: true }) }} variant="outline" pill>
                      Show all applications
                    </Button>
                  )
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