import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { employerApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import TablePagination from '../../components/ui/TablePagination'
import EmptyState from '../../components/ui/EmptyState'
import Card from '../../components/ui/Card'
import LoadingState from '../../components/ui/LoadingState'
import Reveal from '../../components/ui/Reveal'
import { usePlanUsage } from '../../context/PlanUsageContext'

const PAGE_SIZE = 8
const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
]

export default function EmployerJobsPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [reopening, setReopening] = useState(false)
  const [featuringSlug, setFeaturingSlug] = useState(null)
  const [rowError, setRowError] = useState('')
  const { applyServerPlan, showPaywall, plan } = usePlanUsage()
  const featuredRemaining = plan?.usage?.featured?.remaining ?? 0

  const { data, loading, error, reload } = useApiData(
    () => employerApi.jobs(tab === 'all' ? {} : { status: tab }),
    [tab]
  )

  const jobs = useMemo(
    () =>
      (data?.items ?? []).map((job) => ({
        ...job,
        applications_count: job.applications ?? job.applications_count,
      })),
    [data]
  )

  const reopen = async (job) => {
    if (reopening) return
    setReopening(true)
    try {
      await employerApi.updateJobStatus(job.slug, 'open')
      await reload()
    } catch {
      return
    } finally {
      setReopening(false)
    }
  }

  /**
   * Spend or release a featured slot.
   *
   * Optimism is deliberately avoided here. Featuring is a metered action, so
   * showing the star as on before the API agrees would briefly claim a credit
   * the plan may not have, and the user would watch a toggle they never earned.
   * The button is marked busy instead, and the row is only repainted once the
   * server has committed the change.
   */
  const toggleFeatured = async (job) => {
    if (featuringSlug) return
    setFeaturingSlug(job.slug)
    try {
      const result = await employerApi.setJobFeatured(job.slug, !job.is_featured)
      applyServerPlan(result?.usage)
      await reload()
    } catch (error) {
      // Spent featured credits come back as 403 `plan_limit_reached`; the
      // paywall names the allowance that ran out. Nothing is changed locally.
      if (showPaywall(error, { resource: 'featured_job' })) return
      setRowError(error?.message || 'We could not update the featured status.')
    } finally {
      setFeaturingSlug(null)
    }
  }

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return jobs.filter((job) => {
      const matchesTab = tab === 'all' || job.status === tab
      const matchesQuery = !q || job.title.toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [jobs, tab, query])

  const visible = visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <LoadingState text="Loading your job postings…" />
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
              title="Couldn't load your job postings"
              text="Something went wrong while fetching your jobs. Please try again."
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
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <PageHeader
          eyebrow="EMPLOYER"
          title="My Job Posts"
          subtitle="Create, manage and track all of your job postings."
          action={
            <Link to="/employer/jobs/create" className="hh-btn hh-btn-primary hh-btn-pill">
              <i className="bi bi-plus-lg hh-me-1" aria-hidden="true" />
              Post a new job
            </Link>
          }
        />

        <div className="hh-tabs hh-mb-3" role="tablist" aria-label="Job status">
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`hh-tab ${tab === key ? 'is-active' : ''}`}
              role="tab"
              aria-selected={tab === key}
              onClick={() => {
                setTab(key)
                setPage(1)
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="hh-search-field-lg hh-mb-4">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            type="search"
            className="hh-form-control"
            placeholder="Search your jobs…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            aria-label="Search jobs"
          />
        </div>

        <Card className="hh-card-body hh-p-0 hh-card--table">
          {rowError && (
            <div className="alert alert-danger rounded-0 border-0 border-bottom mb-0 py-2 small" role="alert">
              {rowError}
            </div>
          )}
          {visible.length > 0 ? (
            <DataTable
              columns={[
                { key: 'title', label: 'Job title' },
                { key: 'applicants', label: 'Applicants' },
                { key: 'views', label: 'View counts' },
                { key: 'status', label: 'Status' },
                { key: 'featured', label: 'Featured' },
                { key: 'action', label: 'Action', align: 'right' },
              ]}
              rows={visible.map((job) => {
                const isOpen = job.status === 'open'
                const isFeatured = Boolean(job.is_featured)
                const busy = featuringSlug === job.slug
                // Free plans have no featured slots at all, so the control is
                // shown disabled with the reason attached rather than hidden:
                // an absent control would read as "nothing to do here".
                const noCredits = !isFeatured && featuredRemaining <= 0
                return {
                  id: job.id,
                  title: <span className="hh-fw-semibold">{job.title}</span>,
                  applicants: job.applications_count || 0,
                  views: job.views || 0,
                  status: isOpen ? (
                    <StatusBadge status="open" />
                  ) : (
                    <StatusBadge status={job.status} />
                  ),
                  featured: (
                    <button
                      type="button"
                      className={`btn btn-sm ${isFeatured ? 'btn-warning' : 'btn-outline-warning'}`}
                      onClick={() => toggleFeatured(job)}
                      disabled={Boolean(featuringSlug) || noCredits}
                      aria-pressed={isFeatured}
                      aria-busy={busy}
                      title={
                        noCredits
                          ? 'Your plan has no featured slots left — upgrade to feature more jobs'
                          : isFeatured
                            ? 'Remove this job from the featured list'
                            : 'Feature this job'
                      }
                    >
                      {busy ? (
                        <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                      ) : (
                        <i className={`bi ${isFeatured ? 'bi-star-fill' : 'bi-star'} me-1`} aria-hidden="true" />
                      )}
                      <span className="small">{isFeatured ? 'Featured' : 'Feature'}</span>
                    </button>
                  ),
                  action: isOpen ? (
                    <Link to={`/employer/jobs/${job.slug || job.id}`} className="hh-btn hh-btn-outline-primary hh-btn-sm">
                      Manage
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="hh-btn hh-btn-outline-primary hh-btn-sm"
                      onClick={() => reopen(job)}
                    >
                      Reopen
                    </button>
                  ),
                }
              })}
              rowKey={(row) => row.id}
            />
          ) : (
            <div className="hh-p-5">
              <EmptyState icon="briefcase" title="No jobs match" text="Try a different status or search term." />
            </div>
          )}
        </Card>

        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={visibleRows.length}
          onPageChange={setPage}
        />
      </div>
    </section>
  )
}