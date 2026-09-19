import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { applicants, STATUS_OPTIONS, STATUS_VARIANT, STATUS_LABEL } from '../../data/applicants'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return applicants.filter(
      (applicant) =>
        (status === 'all' || applicant.status === status) && matchesQuery(applicant, q)
    )
  }, [status, query])

  const statusCounts = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = applicants.filter((applicant) => matchesQuery(applicant, q))
    return STATUS_OPTIONS.reduce((acc, opt) => {
      acc[opt.value] =
        opt.value === 'all'
          ? base.length
          : base.filter((applicant) => applicant.status === opt.value).length
      return acc
    }, {})
  }, [query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <div className="hh-toolbar hh-toolbar-between hh-mb-4">
              <SectionHeading
                eyebrow="EMPLOYER DASHBOARD"
                title="All Applicants"
                subtitle="Review and manage applications submitted to your jobs."
                centered={false}
              />
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
            </div>
          </Reveal>

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
            <Reveal>
              <Card elevated className="hh-card-body hh-p-0 hh-card--table">
                <div className="table-responsive">
                  <table className="hh-table hh-table--zebra hh-table-hover hh-mb-0">
                    <thead>
                      <tr>
                        <th>Applicant</th>
                        <th>Current Role</th>
                        <th>Applied For</th>
                        <th>Applied</th>
                        <th className="hh-table-col-center">Match %</th>
                        <th className="hh-table-col-center">Status</th>
                        <th className="hh-table-col-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <div className="hh-applicant-cell">
                              <span
                                className="hh-avatar hh-avatar-xs hh-avatar-soft"
                                aria-hidden="true"
                              >
                                {getInitials(a.name)}
                              </span>
                              <div className="hh-applicant-meta">
                                <Link
                                  to={`/employer/applicants/${a.id}`}
                                  className="hh-applicant-name"
                                >
                                  {a.name}
                                </Link>
                                <span className="hh-applicant-email">{a.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>{a.role}</td>
                          <td>{a.job}</td>
                          <td>{a.applied}</td>
                          <td className="hh-table-col-center">
                            <Badge variant="primary">{a.match}%</Badge>
                          </td>
                          <td className="hh-table-col-center">
                            <Badge variant={STATUS_VARIANT[a.status] || 'secondary'} dot>
                              {STATUS_LABEL[a.status] || a.status}
                            </Badge>
                          </td>
                          <td className="hh-table-col-right">
                            <Button
                              to={`/employer/applicants/${a.id}`}
                              variant="outline-primary"
                              size="sm"
                            >
                              Review
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </Reveal>
          ) : (
            <Card className="hh-card-body">
              <EmptyState
                icon="inbox"
                title="No applicants found"
                text="Try a different search or status filter."
              />
            </Card>
          )}

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
