import { useState, useMemo } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminStatGrid from '../../components/admin/AdminStatGrid'
import UserCell from '../../components/admin/UserCell'
import RowDetailModal from '../../components/admin/RowDetailModal'
import StatusBadge from '../../components/ui/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import TablePagination from '../../components/ui/TablePagination'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Alert from '../../components/ui/Alert'
import { adminJobSeekers, ACCOUNT_LABELS } from '../../data/admin'
import { adminApi } from '../../services/api'
import { adaptJobSeekers } from '../../services/api/adminAdapters'
import { useAdminList } from '../../hooks/useAdminData'

const PAGE_SIZE = 8

export default function AdminJobSeekersPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [reloadTick, setReloadTick] = useState(0)
  const [viewing, setViewing] = useState(null)
  const [notice, setNotice] = useState(null)
  const [pendingId, setPendingId] = useState(null)

  const { items: seekers } = useAdminList(
    () => adminApi.jobSeekers({}).then(adaptJobSeekers),
    adminJobSeekers,
    [reloadTick]
  )

  // Confirmed, reversible, and reports failures instead of swallowing them.
  const toggleStatus = async (seeker) => {
    const suspending = seeker.status !== 'suspended'
    const verb = suspending ? 'Suspend' : 'Reactivate'
    const detail = suspending
      ? 'They will not be able to sign in until reactivated.'
      : 'They will be able to sign in again immediately.'

    if (!window.confirm(`${verb} ${seeker.name}?

${detail}`)) return

    setPendingId(seeker.id)
    setNotice(null)
    try {
      const res = await adminApi.updateUserStatus(
        seeker.id,
        suspending ? 'suspended' : 'active'
      )
      setNotice({ type: 'success', message: res?.message || `${seeker.name} was ${suspending ? 'suspended' : 'reactivated'}.` })
      setReloadTick((tick) => tick + 1)
      setViewing((current) => (current?.id === seeker.id ? { ...current, status: suspending ? 'suspended' : 'active' } : current))
    } catch (err) {
      setNotice({ type: 'danger', message: err?.message || `Could not ${verb.toLowerCase()} ${seeker.name}.` })
    } finally {
      setPendingId(null)
    }
  }

  const activeCount = seekers.filter((user) => user.status === 'active').length
  const suspendedCount = seekers.filter((user) => user.status === 'suspended').length

  const stats = [
    { key: 'seekers', label: 'Total Job Seekers', value: seekers.length, icon: 'bi-person-badge', tone: 'primary' },
    { key: 'active', label: 'Active Accounts', value: activeCount, icon: 'bi-check-circle', tone: 'success' },
    { key: 'suspended', label: 'Suspended', value: suspendedCount, icon: 'bi-shield-exclamation', tone: 'danger' },
  ]

  const tabs = [
    { key: 'all', label: 'All', count: seekers.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'suspended', label: 'Suspended', count: suspendedCount },
  ]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return seekers.filter((user) => {
      const matchesTab = tab === 'all' || user.status === tab
      const matchesQuery =
        !q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [tab, query, seekers])

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
                seeker: <UserCell name={user.name} meta={user.email} avatarUrl={user.avatar_url} />,
                location: user.location,
                years: `${user.years} yrs`,
                applications: user.applications,
                saved_jobs: user.saved_jobs,
                status: <StatusBadge status={user.status} label={ACCOUNT_LABELS[user.status]} />,
                actions: (
                  <div className="d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="hh-icon-btn"
                      data-tooltip="View job seeker"
                      aria-label={`View ${user.name}`}
                      onClick={() => setViewing(user)}
                    >
                      <i className="bi bi-eye" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`hh-icon-btn hh-tip-start ${user.status === 'suspended' ? 'hh-icon-btn-success' : 'hh-icon-btn-danger'}`}
                      data-tooltip={user.status === 'suspended' ? 'Reactivate user' : 'Suspend user'}
                      aria-label={`${user.status === 'suspended' ? 'Reactivate' : 'Suspend'} ${user.name}`}
                      disabled={pendingId === user.id}
                      onClick={() => toggleStatus(user)}
                    >
                      <i
                        className={`bi bi-${user.status === 'suspended' ? 'person-check' : 'person-x'}`}
                        aria-hidden="true"
                      />
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

        <RowDetailModal
          isOpen={Boolean(viewing)}
          onClose={() => setViewing(null)}
          title={viewing?.name}
          subtitle="Job seeker"
          status={viewing ? { value: viewing.status, label: ACCOUNT_LABELS[viewing.status] } : null}
          fields={[
            { label: 'Email', value: viewing?.email },
            { label: 'Phone', value: viewing?.phone },
            { label: 'Headline', value: viewing?.headline },
            { label: 'Location', value: viewing?.location },
            { label: 'Experience', value: viewing?.years },
            { label: 'Applications', value: viewing?.applications },
            { label: 'Saved jobs', value: viewing?.saved_jobs },
            { label: 'Joined', value: viewing?.joined },
            { label: 'Last active', value: viewing?.last_active },
            { label: 'User ID', value: viewing?.id != null ? `#${viewing.id}` : undefined, muted: true },
          ]}
        />

        {notice ? (
          <div className="hh-mt-4">
            <Alert variant={notice.type} dismissible onDismiss={() => setNotice(null)}>
              {notice.message}
            </Alert>
          </div>
        ) : null}
      </div>
    </section>
  )
}