import { useState, useMemo } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminStatGrid from '../../components/admin/AdminStatGrid'
import UserCell from '../../components/admin/UserCell'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import { adminJobSeekers, ACCOUNT_LABELS, ACCOUNT_VARIANT } from '../../data/admin'

const PAGE_SIZE = 8

export default function AdminJobSeekersPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const activeCount = adminJobSeekers.filter((user) => user.status === 'active').length
  const suspendedCount = adminJobSeekers.filter((user) => user.status === 'suspended').length

  const stats = [
    { key: 'seekers', label: 'Total Job Seekers', value: adminJobSeekers.length, icon: 'bi-person-badge', tone: 'primary' },
    { key: 'active', label: 'Active Accounts', value: activeCount, icon: 'bi-check-circle', tone: 'success' },
    { key: 'suspended', label: 'Suspended', value: suspendedCount, icon: 'bi-shield-exclamation', tone: 'danger' },
  ]

  const tabs = [
    { key: 'all', label: 'All', count: adminJobSeekers.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'suspended', label: 'Suspended', count: suspendedCount },
  ]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return adminJobSeekers.filter((user) => {
      const matchesTab = tab === 'all' || user.status === tab
      const matchesQuery =
        !q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
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
          title="Job Seekers"
          subtitle="Review candidate accounts, their activity and account status."
        />

        <AdminStatGrid stats={stats} cols={3} />

        <div className="hh-tabs hh-tabs--pills hh-mb-3" role="tablist" aria-label="Seeker status">
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
            placeholder="Search job seekers…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            aria-label="Search job seekers"
          />
        </div>

        <Card className="hh-card-body hh-p-0 hh-card--table">
          {visible.length > 0 ? (
            <div className="table-responsive">
              <table className="hh-table hh-table-hover hh-mb-0">
                <thead>
                  <tr>
                    <th>Seeker</th>
                    <th>Location</th>
                    <th>Experience</th>
                    <th>Applications</th>
                    <th>Saved jobs</th>
                    <th>Status</th>
                    <th className="hh-table-col-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <UserCell name={user.name} meta={user.email} />
                      </td>
                      <td>{user.location}</td>
                      <td>{user.years} yrs</td>
                      <td>{user.applications}</td>
                      <td>{user.saved_jobs}</td>
                      <td>
                        <Badge variant={ACCOUNT_VARIANT[user.status]} dot sm>
                          {ACCOUNT_LABELS[user.status]}
                        </Badge>
                      </td>
                      <td className="hh-table-col-right">
                        <div className="d-flex justify-content-end gap-2">
                          <button type="button" className="hh-icon-btn" data-tooltip="View job seeker" aria-label={`View ${user.name}`}>
                            <i className="bi bi-eye" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="hh-icon-btn hh-icon-btn-danger hh-tip-start"
                            data-tooltip="Suspend user"
                            aria-label={`Suspend ${user.name}`}
                          >
                            <i className="bi bi-person-x" aria-hidden="true" />
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
              <EmptyState icon="person-badge" title="No job seekers match" text="Try a different search term or status filter." />
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