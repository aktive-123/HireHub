import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { employerApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import { STATUS_OPTIONS } from '../../data/applicants'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import TablePagination from '../../components/ui/TablePagination'
import EmptyState from '../../components/ui/EmptyState'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import LoadingState from '../../components/ui/LoadingState'
import Reveal from '../../components/ui/Reveal'

const PAGE_SIZE = 8

const matchesQuery = (applicant, query) =>
  !query ||
  applicant.name.toLowerCase().includes(query) ||
  applicant.role.toLowerCase().includes(query) ||
  applicant.job.toLowerCase().includes(query)

const getInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

export default function EmployerApplicantsPage() {
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const { data: list, loading, error, reload } = useApiData(
    () => employerApi.applicants(status === 'all' ? {} : { status }),
    [status]
  )
  const countsFetch = useApiData(() => employerApi.applicants(), [])
  const allApplicants = countsFetch.data ?? []

  const applicants = list ?? []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return applicants.filter(
      (applicant) =>
        (status === 'all' || applicant.status === status) && matchesQuery(applicant, q)
    )
  }, [applicants, status, query])

  const statusCounts = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = allApplicants.filter((applicant) => matchesQuery(applicant, q))
    return STATUS_OPTIONS.reduce((acc, opt) => {
      acc[opt.value] =
        opt.value === 'all'
          ? base.length
          : base.filter((applicant) => applicant.status === opt.value).length
      return acc
    }, {})
  }, [allApplicants, query])

  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <LoadingState text="Loading applicants…" />
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
              title="Couldn't load applicants"
              text="Something went wrong while fetching your applicants. Please try again."
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
          eyebrow="EMPLOYER DASHBOARD"
          title="All Applicants"
          subtitle="Review and manage applications submitted to your jobs."
          action={
            <div className="hh-search-field hh-search-field-lg">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                className="hh-form-control"
                placeholder="Search applicants…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
                aria-label="Search applicants"
              />
            </div>
          }
        />

        <div className="hh-tabs hh-tabs--pills hh-mb-4" role="tablist" aria-label="Filter by status">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={status === opt.value}
              className={`hh-tab ${status === opt.value ? 'is-active' : ''}`}
              onClick={() => {
                setStatus(opt.value)
                setPage(1)
              }}
            >
              {opt.label}
              <span className="hh-tab-count">{statusCounts[opt.value]}</span>
            </button>
          ))}
        </div>

        {visible.length > 0 ? (
          <Card elevated className="hh-card-body hh-p-0 hh-card--table">
            <DataTable
              zebra
              columns={[
                { key: 'applicant', label: 'Applicant' },
                { key: 'role', label: 'Current Role' },
                { key: 'job', label: 'Applied For' },
                { key: 'applied', label: 'Applied' },
                { key: 'match', label: 'Match %', align: 'center' },
                { key: 'status', label: 'Status', align: 'center' },
                { key: 'action', label: 'Action', align: 'right' },
              ]}
              rows={visible.map((a) => ({
                id: a.id,
                applicant: (
                  <div className="hh-applicant-cell">
                    <span className="hh-avatar hh-avatar-xs hh-avatar-soft" aria-hidden="true">
                      {getInitials(a.name)}
                    </span>
                    <div className="hh-applicant-meta">
                      <Link to={`/employer/applicants/${a.id}`} className="hh-applicant-name">
                        {a.name}
                      </Link>
                      <span className="hh-applicant-email">{a.email}</span>
                    </div>
                  </div>
                ),
                role: a.role,
                job: a.job,
                applied: a.applied,
                match: <Badge variant="primary">{a.match}%</Badge>,
                status: <StatusBadge status={a.status} />,
                action: (
                  <Link
                    to={`/employer/applicants/${a.id}`}
                    className="hh-btn hh-btn-outline-primary hh-btn-sm"
                  >
                    {a.status === 'hired' || a.status === 'rejected' ? 'View' : 'Review'}
                  </Link>
                ),
              }))}
              rowKey={(row) => row.id}
            />
          </Card>
        ) : (
          <Card className="hh-card-body">
            <EmptyState
              icon="inbox"
              title="No applicants found"
              text="Try a different search or status filter."
            />
          </Card>
        )}

        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
        />
      </div>
    </section>
  )
}