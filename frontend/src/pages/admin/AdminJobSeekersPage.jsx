import { useState, useMemo } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminStatGrid from '../../components/admin/AdminStatGrid'
import UserCell from '../../components/admin/UserCell'
import StatusBadge from '../../components/ui/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import TablePagination from '../../components/ui/TablePagination'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import { adminJobSeekers, ACCOUNT_LABELS } from '../../data/admin'

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

        <div className="hh-search-field-lg hh-mb-4">
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
            <DataTable
              zebra
              columns={[
                { key: 'seeker', label: 'Seeker' },
                { key: 'location', label: 'Location' },
                { key: 'years', label: 'Experience' },
                { key: 'applications', label: 'Applications' },
                { key: 'saved_jobs', label: 'Saved jobs' },
                { key: 'status', label: 'Status' },
                { key: 'actions', label: 'Actions', align: 'right' },
              ]}
              rows={visible.map((user) => ({
                id: user.id,
                seeker: <UserCell name={user.name} meta={user.email} />,
                location: user.location,
                years: `${user.years} yrs`,
                applications: user.applications,
                saved_jobs: user.saved_jobs,
                status: <StatusBadge status={user.status} label={ACCOUNT_LABELS[user.status]} />,
                actions: (
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
                ),
              }))}
              rowKey={(row) => row.id}
            />
          ) : (
            <div className="hh-p-5">
              <EmptyState icon="person-badge" title="No job seekers match" text="Try a different search term or status filter." />
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