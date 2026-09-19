import { useState, useMemo } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminStatGrid from '../../components/admin/AdminStatGrid'
import UserCell from '../../components/admin/UserCell'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import { adminEmployers, ACCOUNT_LABELS, ACCOUNT_VARIANT } from '../../data/admin'

const PAGE_SIZE = 8

export default function AdminEmployersPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const activeCount = adminEmployers.filter((emp) => emp.status === 'active').length
  const pendingCount = adminEmployers.filter((emp) => emp.status === 'pending').length
  const suspendedCount = adminEmployers.filter((emp) => emp.status === 'suspended').length

  const stats = [
    { key: 'employers', label: 'Total Employers', value: adminEmployers.length, icon: 'bi-briefcase', tone: 'primary' },
    { key: 'active', label: 'Active Accounts', value: activeCount, icon: 'bi-check-circle', tone: 'success' },
    { key: 'pending', label: 'Pending Review', value: pendingCount, icon: 'bi-hourglass-split', tone: 'warning' },
  ]

  const tabs = [
    { key: 'all', label: 'All', count: adminEmployers.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'suspended', label: 'Suspended', count: suspendedCount },
  ]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return adminEmployers.filter((emp) => {
      const matchesTab = tab === 'all' || emp.status === tab
      const matchesQuery =
        !q ||
        emp.company.toLowerCase().includes(q) ||
        emp.contact.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q)
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
          title="Employers"
          subtitle="Manage employer accounts, verification and open job counts."
        />

        <AdminStatGrid stats={stats} cols={3} />

        <div className="hh-tabs hh-tabs--pills hh-mb-3" role="tablist" aria-label="Employer status">
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
            placeholder="Search employers by company or contact…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            aria-label="Search employers"
          />
        </div>

        <Card className="hh-card-body hh-p-0 hh-card--table">
          {visible.length > 0 ? (
            <div className="table-responsive">
              <table className="hh-table hh-table-hover hh-mb-0">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Industry</th>
                    <th>Open jobs</th>
                    <th>Verified</th>
                    <th>Status</th>
                    <th className="hh-table-col-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <UserCell
                          name={emp.company}
                          logoText={emp.logoText}
                          logoBg={emp.logoBg}
                          logoColor={emp.logoColor}
                          square
                        />
                      </td>
                      <td>
                        <span className="hh-fw-medium">{emp.contact}</span>
                        <span className="text-muted d-block small">{emp.email}</span>
                      </td>
                      <td>{emp.industry}</td>
                      <td>{emp.jobs}</td>
                      <td>
                        <Badge variant={emp.verified ? 'success' : 'secondary'} sm icon={emp.verified ? 'patch-check' : 'shield-x'}>
                          {emp.verified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={ACCOUNT_VARIANT[emp.status]} dot sm>
                          {ACCOUNT_LABELS[emp.status]}
                        </Badge>
                      </td>
                      <td className="hh-table-col-right">
                        <div className="d-flex justify-content-end gap-2">
                          <button type="button" className="hh-icon-btn" data-tooltip="View employer" aria-label={`View ${emp.company}`}>
                            <i className="bi bi-eye" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="hh-icon-btn hh-icon-btn-danger hh-tip-start"
                            data-tooltip="Suspend employer"
                            aria-label={`Suspend ${emp.company}`}
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
              <EmptyState icon="briefcase" title="No employers match" text="Try a different search term or status filter." />
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