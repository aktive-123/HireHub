import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import UserCell from '../../components/admin/UserCell'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import Pagination from '../../components/ui/Pagination'
import { adminCompanies, ACCOUNT_LABELS, ACCOUNT_VARIANT } from '../../data/admin'

const PAGE_SIZE = 8

export default function AdminCompaniesPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const activeCount = adminCompanies.filter((company) => company.status === 'active').length
  const pendingCount = adminCompanies.filter((company) => company.status === 'pending').length
  const verifiedCount = adminCompanies.filter((company) => company.verified).length

  const tabs = [
    { key: 'all', label: 'All', count: adminCompanies.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'pending', label: 'Pending', count: pendingCount },
  ]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return adminCompanies.filter((company) => {
      const matchesTab = tab === 'all' || company.status === tab
      const matchesQuery =
        !q || company.name.toLowerCase().includes(q) || company.location.toLowerCase().includes(q)
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
          title="Companies"
          subtitle="Review company profiles, verification status and listing activity."
          action={
            <Button variant="primary" icon="bi-plus-lg">
              Add company
            </Button>
          }
        />

        <div className="row g-4 hh-mb-4">
          <div className="col-12 col-md-4">
            <Card className="hh-stat-card hh-card-hover">
              <div className="hh-stat-icon hh-stat-icon-primary">
                <i className="bi bi-buildings" aria-hidden="true" />
              </div>
              <div className="hh-stat-value">{adminCompanies.length}</div>
              <div className="hh-stat-label">Total Companies</div>
            </Card>
          </div>
          <div className="col-12 col-md-4">
            <Card className="hh-stat-card hh-card-hover">
              <div className="hh-stat-icon hh-stat-icon-success">
                <i className="bi bi-patch-check" aria-hidden="true" />
              </div>
              <div className="hh-stat-value">{verifiedCount}</div>
              <div className="hh-stat-label">Verified Companies</div>
            </Card>
          </div>
          <div className="col-12 col-md-4">
            <Card className="hh-stat-card hh-card-hover">
              <div className="hh-stat-icon hh-stat-icon-warning">
                <i className="bi bi-hourglass-split" aria-hidden="true" />
              </div>
              <div className="hh-stat-value">{pendingCount}</div>
              <div className="hh-stat-label">Pending Approval</div>
            </Card>
          </div>
        </div>

        <div className="hh-tabs hh-tabs--pills hh-mb-3" role="tablist" aria-label="Company status">
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
            placeholder="Search companies…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            aria-label="Search companies"
          />
        </div>

        <Card className="hh-card-body hh-p-0 hh-card--table">
          {visible.length > 0 ? (
            <div className="table-responsive">
              <table className="hh-table hh-table-hover hh-mb-0">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Industry</th>
                    <th>Location</th>
                    <th>Size</th>
                    <th>Open jobs</th>
                    <th>Verified</th>
                    <th>Status</th>
                    <th className="hh-table-col-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((company) => (
                    <tr key={company.id}>
                      <td>
                        <UserCell
                          name={company.name}
                          meta={company.slug}
                          to={`/companies/${company.id}`}
                          logoText={company.logoText}
                          logoBg={company.logoBg}
                          logoColor={company.logoColor}
                          square
                        />
                      </td>
                      <td>{company.industry}</td>
                      <td>{company.location}</td>
                      <td>{company.size}</td>
                      <td>{company.jobs}</td>
                      <td>
                        <Badge variant={company.verified ? 'success' : 'secondary'} sm icon={company.verified ? 'patch-check' : 'shield-x'}>
                          {company.verified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={ACCOUNT_VARIANT[company.status]} dot sm>
                          {ACCOUNT_LABELS[company.status]}
                        </Badge>
                      </td>
                      <td className="hh-table-col-right">
                        <div className="d-flex justify-content-end gap-2">
                          <Link to={`/companies/${company.id}`} className="hh-icon-btn" data-tooltip="View on site" aria-label={`View ${company.name} on site`}>
                            <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                          </Link>
                          <button type="button" className="hh-icon-btn" data-tooltip="Edit company" aria-label={`Edit ${company.name}`}>
                            <i className="bi bi-pencil" aria-hidden="true" />
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
              <EmptyState icon="buildings" title="No companies match" text="Try a different search term or status filter." />
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