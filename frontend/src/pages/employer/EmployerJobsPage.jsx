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
          {visible.length > 0 ? (
            <DataTable
              columns={[
                { key: 'title', label: 'Job title' },
                { key: 'applicants', label: 'Applicants' },
                { key: 'views', label: 'View counts' },
                { key: 'status', label: 'Status' },
                { key: 'action', label: 'Action', align: 'right' },
              ]}
              rows={visible.map((job) => {
                const isOpen = job.status === 'open'
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