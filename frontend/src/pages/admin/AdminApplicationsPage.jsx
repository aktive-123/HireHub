import { useState, useMemo } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import UserCell from '../../components/admin/UserCell'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import { adminApplications } from '../../data/admin'
import { STATUS_LABEL, STATUS_VARIANT, STATUS_OPTIONS } from '../../data/applicants'

const PAGE_SIZE = 8

export default function AdminApplicationsPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const countByStatus = (status) =>
    adminApplications.filter((app) => app.status === status).length

  const tabs = [
    { key: 'all', label: 'All', count: adminApplications.length },
    ...STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => ({
      key: option.value,
      label: STATUS_LABEL[option.value],
      count: countByStatus(option.value),
    })),
  ]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return adminApplications.filter((app) => {
      const matchesTab = tab === 'all' || app.status === tab
      const matchesQuery =
        !q ||
        app.applicant.toLowerCase().includes(q) ||
        app.job.toLowerCase().includes(q) ||
        app.company.toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [tab, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <AdminPageHeader
          eyebrow="ADMIN CONSOLE"
          title="Applications"
          subtitle="Review every application flowing through the platform and its current stage."
        />

        <div className="hh-tabs hh-tabs--pills hh-mb-3" role="tablist" aria-label="Application status">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`hh-tab ${tab === key ? 'is-active' : ''}`}
              onClick={() => {
                setTab(key)
                setPage(1)
              }}
            >
              {label} <span className="hh-tab-count">{count}</span>
            </button>
          ))}
        </div>

        <div className="hh-search-field hh-mb-4">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            type="search"
            className="hh-form-control"
            placeholder="Search by applicant, job or company…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            aria-label="Search applications"
          />
        </div>

        <Card className="hh-card-body hh-p-0 hh-card--table">
          {visible.length > 0 ? (
            <div className="table-responsive">
              <table className="hh-table hh-table-hover hh-mb-0">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Applied for</th>
                    <th>Applied</th>
                    <th className="hh-table-col-center">Match</th>
                    <th>Status</th>
                    <th className="hh-table-col-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <UserCell name={app.applicant} meta={app.email} />
                      </td>
                      <td>
                        <span className="hh-fw-medium">{app.job}</span>
                        <span className="text-muted d-block small">{app.company}</span>
                      </td>
                      <td>{app.applied}</td>
                      <td className="hh-table-col-center">
                        <Badge variant="info" sm>{app.match}%</Badge>
                      </td>
                      <td>
                        <Badge variant={STATUS_VARIANT[app.status]} dot sm>
                          {STATUS_LABEL[app.status]}
                        </Badge>
                      </td>
                      <td className="hh-table-col-right">
                        <div className="d-flex justify-content-end gap-2">
                          <button type="button" className="hh-icon-btn" data-tooltip="View application" aria-label={`View application from ${app.applicant}`}>
                            <i className="bi bi-eye" aria-hidden="true" />
                          </button>
                          <button type="button" className="hh-icon-btn" data-tooltip="Move to next stage" aria-label={`Move ${app.applicant} to next stage`}>
                            <i className="bi bi-arrow-right-circle" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="hh-p-5">
              <EmptyState icon="inbox" title="No applications match" text="Try a different search term or status filter." />
            </div>
          )}
        </Card>

        {totalPages > 1 && (
          <div className="hh-mt-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </section>
  )
}