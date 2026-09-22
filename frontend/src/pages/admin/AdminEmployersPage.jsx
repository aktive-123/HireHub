import { useState, useMemo } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminStatGrid from '../../components/admin/AdminStatGrid'
import UserCell from '../../components/admin/UserCell'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import TablePagination from '../../components/ui/TablePagination'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import { adminEmployers, ACCOUNT_LABELS } from '../../data/admin'

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

        <div className="hh-search-field-lg hh-mb-4">
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
            <DataTable
              zebra
              columns={[
                { key: 'company', label: 'Company' },
                { key: 'contact', label: 'Contact' },
                { key: 'industry', label: 'Industry' },
                { key: 'jobs', label: 'Open jobs' },
                { key: 'verified', label: 'Verified' },
                { key: 'status', label: 'Status' },
                { key: 'actions', label: 'Actions', align: 'right' },
              ]}
              rows={visible.map((emp) => ({
                id: emp.id,
                company: (
                  <UserCell
                    name={emp.company}
                    logoText={emp.logoText}
                    logoBg={emp.logoBg}
                    logoColor={emp.logoColor}
                    square
                  />
                ),
                contact: (
                  <>
                    <span className="hh-fw-medium">{emp.contact}</span>
                    <span className="text-muted d-block small">{emp.email}</span>
                  </>
                ),
                industry: emp.industry,
                jobs: emp.jobs,
                verified: (
                  <Badge variant={emp.verified ? 'success' : 'secondary'} sm icon={emp.verified ? 'patch-check' : 'shield-x'}>
                    {emp.verified ? 'Verified' : 'Unverified'}
                  </Badge>
                ),
                status: <StatusBadge status={emp.status} label={ACCOUNT_LABELS[emp.status]} />,
                actions: (
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
                ),
              }))}
              rowKey={(row) => row.id}
            />
          ) : (
            <div className="hh-p-5">
              <EmptyState icon="briefcase" title="No employers match" text="Try a different search term or status filter." />
            </div>
          )}
        </Card>

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