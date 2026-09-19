import { useState, useMemo } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import UserCell from '../../components/admin/UserCell'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import {
  adminUsers,
  ROLE_LABELS,
  ROLE_VARIANT,
  ACCOUNT_LABELS,
  ACCOUNT_VARIANT,
} from '../../data/admin'

const PAGE_SIZE = 8

function countByRole(role) {
  return adminUsers.filter((user) => user.role === role).length
}

export default function AdminUsersPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const tabs = [
    { key: 'all', label: 'All', count: adminUsers.length },
    { key: 'seeker', label: 'Job Seekers', count: countByRole('seeker') },
    { key: 'employer', label: 'Employers', count: countByRole('employer') },
    { key: 'admin', label: 'Admins', count: countByRole('admin') },
  ]
  const activeTab = tabs.find((t) => t.key === tab)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return adminUsers.filter((user) => {
      const matchesTab = tab === 'all' || user.role === tab
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
          title="All Users"
          subtitle="Search and manage every account on the platform — job seekers, employers and administrators."
        />

        <div className="hh-tabs hh-tabs--pills hh-mb-3" role="tablist" aria-label="User roles">
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
            placeholder={`Search ${(activeTab?.label || 'users').toLowerCase()}…`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            aria-label="Search users"
          />
        </div>

        <Card className="hh-card-body hh-p-0 hh-card--table">
          {visible.length > 0 ? (
            <div className="table-responsive">
              <table className="hh-table hh-table-hover hh-mb-0">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Last active</th>
                    <th className="hh-table-col-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <UserCell name={user.name} meta={user.email} />
                      </td>
                      <td>
                        <Badge variant={ROLE_VARIANT[user.role]} sm>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={ACCOUNT_VARIANT[user.status]} dot sm>
                          {ACCOUNT_LABELS[user.status]}
                        </Badge>
                      </td>
                      <td>{user.joined}</td>
                      <td>{user.last_active}</td>
                      <td className="hh-table-col-right">
                        <div className="d-flex justify-content-end gap-2">
                          <button type="button" className="hh-icon-btn" data-tooltip="View user" aria-label={`View ${user.name}`}>
                            <i className="bi bi-eye" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="hh-icon-btn hh-icon-btn-danger hh-tip-start"
                            data-tooltip="Suspend user"
                            aria-label={`Suspend ${user.name}`}
                            disabled={user.role === 'admin'}
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
              <EmptyState icon="people" title="No users match" text="Try a different search term or role filter." />
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