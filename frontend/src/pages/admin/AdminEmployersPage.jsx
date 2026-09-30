import { useState, useMemo } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminStatGrid from '../../components/admin/AdminStatGrid'
import UserCell from '../../components/admin/UserCell'
import RowDetailModal from '../../components/admin/RowDetailModal'
import Badge from '../../components/ui/Badge'
import Alert from '../../components/ui/Alert'
import StatusBadge from '../../components/ui/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import TablePagination from '../../components/ui/TablePagination'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import { adminEmployers, ACCOUNT_LABELS } from '../../data/admin'
import { adminApi } from '../../services/api'
import { adaptEmployers } from '../../services/api/adminAdapters'
import { useAdminList } from '../../hooks/useAdminData'

const PAGE_SIZE = 8

export default function AdminEmployersPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [reloadTick, setReloadTick] = useState(0)
  const [viewing, setViewing] = useState(null)
  const [notice, setNotice] = useState(null)
  const [pendingId, setPendingId] = useState(null)

  const { items: employers } = useAdminList(
    () => adminApi.employers({}).then(adaptEmployers),
    adminEmployers,
    [reloadTick]
  )

  // Confirmed, reversible, and reports failures instead of swallowing them.
  const toggleStatus = async (emp) => {
    const suspending = emp.status !== 'suspended'
    const verb = suspending ? 'Suspend' : 'Reactivate'
    const detail = suspending
      ? 'They will not be able to sign in until reactivated.'
      : 'They will be able to sign in again immediately.'

    if (!window.confirm(`${verb} ${emp.company}?

${detail}`)) return

    setPendingId(emp.id)
    setNotice(null)
    try {
      const res = await adminApi.updateUserStatus(emp.id, suspending ? 'suspended' : 'active')
      setNotice({
        type: 'success',
        message: res?.message || `${emp.company} was ${suspending ? 'suspended' : 'reactivated'}.`,
      })
      setReloadTick((tick) => tick + 1)
      setViewing((current) =>
        current?.id === emp.id
          ? { ...current, status: suspending ? 'suspended' : 'active' }
          : current
      )
    } catch (err) {
      setNotice({
        type: 'danger',
        message: err?.message || `Could not ${verb.toLowerCase()} ${emp.company}.`,
      })
    } finally {
      setPendingId(null)
    }
  }

  const activeCount = employers.filter((emp) => emp.status === 'active').length
  const pendingCount = employers.filter((emp) => emp.status === 'pending').length
  const suspendedCount = employers.filter((emp) => emp.status === 'suspended').length

  const stats = [
    { key: 'employers', label: 'Total Employers', value: employers.length, icon: 'bi-briefcase', tone: 'primary' },
    { key: 'active', label: 'Active Accounts', value: activeCount, icon: 'bi-check-circle', tone: 'success' },
    { key: 'pending', label: 'Pending Review', value: pendingCount, icon: 'bi-hourglass-split', tone: 'warning' },
  ]

  const tabs = [
    { key: 'all', label: 'All', count: employers.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'suspended', label: 'Suspended', count: suspendedCount },
  ]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return employers.filter((emp) => {
      const matchesTab = tab === 'all' || emp.status === tab
      const matchesQuery =
        !q ||
        emp.company.toLowerCase().includes(q) ||
        emp.contact.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [tab, query, employers])

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
                    <button
                      type="button"
                      className="hh-icon-btn"
                      data-tooltip="View employer"
                      aria-label={`View ${emp.company}`}
                      onClick={() => setViewing(emp)}
                    >
                      <i className="bi bi-eye" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`hh-icon-btn hh-tip-start ${emp.status === 'suspended' ? 'hh-icon-btn-success' : 'hh-icon-btn-danger'}`}
                      data-tooltip={emp.status === 'suspended' ? 'Reactivate employer' : 'Suspend employer'}
                      aria-label={`${emp.status === 'suspended' ? 'Reactivate' : 'Suspend'} ${emp.company}`}
                      disabled={pendingId === emp.id}
                      onClick={() => toggleStatus(emp)}
                    >
                      <i
                        className={`bi bi-${emp.status === 'suspended' ? 'person-check' : 'person-x'}`}
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

        <RowDetailModal
          isOpen={Boolean(viewing)}
          onClose={() => setViewing(null)}
          title={viewing?.company}
          subtitle="Employer account"
          status={
            viewing
              ? { value: viewing.status, label: ACCOUNT_LABELS[viewing.status], verified: viewing.verified }
              : null
          }
          fields={[
            { label: 'Contact', value: viewing?.contact },
            { label: 'Email', value: viewing?.email },
            { label: 'Phone', value: viewing?.phone },
            { label: 'Industry', value: viewing?.industry },
            { label: 'Location', value: viewing?.location },
            { label: 'Open jobs', value: viewing?.jobs },
            { label: 'Company slug', value: viewing?.company_slug, muted: true },
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