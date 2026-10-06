import { useState, useMemo } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import UserCell from '../../components/admin/UserCell'
import RowDetailModal from '../../components/admin/RowDetailModal'
import ResetPasswordButton from '../../components/admin/ResetPasswordButton'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import TablePagination from '../../components/ui/TablePagination'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Alert from '../../components/ui/Alert'
import {
  adminUsers,
  ROLE_LABELS,
  ROLE_VARIANT,
  ACCOUNT_LABELS,
} from '../../data/admin'
import { adminApi } from '../../services/api'
import { adaptUsers } from '../../services/api/adminAdapters'
import { useAdminList } from '../../hooks/useAdminData'

const PAGE_SIZE = 8

export default function AdminUsersPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [reloadTick, setReloadTick] = useState(0)
  const [viewing, setViewing] = useState(null)
  const [notice, setNotice] = useState(null)
  const [pendingId, setPendingId] = useState(null)

  const { items: users } = useAdminList(
    () => adminApi.users({}).then(adaptUsers),
    adminUsers,
    [reloadTick]
  )

  const countByRole = (role) => users.filter((user) => user.role === role).length

  // Suspend is destructive and reversible, so it is confirmed, reports
  // failures instead of swallowing them, and flips to a reactivate action
  // once the account is already suspended.
  const toggleStatus = async (user) => {
    if (user.role === 'admin') return
    const suspending = user.status !== 'suspended'
    const verb = suspending ? 'Suspend' : 'Reactivate'
    const detail = suspending
      ? 'They will not be able to sign in until reactivated.'
      : 'They will be able to sign in again immediately.'

    if (!window.confirm(`${verb} ${user.name}?\n\n${detail}`)) return

    setPendingId(user.id)
    setNotice(null)
    try {
      const res = await adminApi.updateUserStatus(
        user.id,
        suspending ? 'suspended' : 'active'
      )
      setNotice({ type: 'success', message: res?.message || `${user.name} was ${suspending ? 'suspended' : 'reactivated'}.` })
      setReloadTick((tick) => tick + 1)
      setViewing((current) => (current?.id === user.id ? { ...current, status: suspending ? 'suspended' : 'active' } : current))
    } catch (err) {
      setNotice({ type: 'danger', message: err?.message || `Could not ${verb.toLowerCase()} ${user.name}.` })
    } finally {
      setPendingId(null)
    }
  }

  // The temporary password lives in the dialog's own state, so the table only
  // needs to acknowledge the event and reflect the flag on the row badge.
  const handlePasswordReset = (user, res) => {
    setNotice({
      type: res?.notification_sent ? 'success' : 'warning',
      message: res?.notification_sent
        ? `${user.name} must set a new password at next sign-in.`
        : `${user.name} must set a new password at next sign-in, but the email could not be sent — share the temporary password directly.`,
    })
    setReloadTick((tick) => tick + 1)
  }

  const tabs = [
    { key: 'all', label: 'All', count: users.length },
    { key: 'seeker', label: 'Job Seekers', count: countByRole('seeker') },
    { key: 'employer', label: 'Employers', count: countByRole('employer') },
    { key: 'admin', label: 'Admins', count: countByRole('admin') },
  ]
  const activeTab = tabs.find((t) => t.key === tab)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((user) => {
      const matchesTab = tab === 'all' || user.role === tab
      const matchesQuery =
        !q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [tab, query, users])

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

        <div className="hh-search-field-lg hh-mb-4">
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
            <DataTable
              zebra
              columns={[
                { key: 'user', label: 'User' },
                { key: 'role', label: 'Role' },
                { key: 'status', label: 'Status' },
                { key: 'joined', label: 'Joined' },
                { key: 'last_active', label: 'Last active' },
                { key: 'actions', label: 'Actions', align: 'right' },
              ]}
              rows={visible.map((user) => ({
                id: user.id,
                user: <UserCell name={user.name} meta={user.email} avatarUrl={user.avatar_url} />,
                role: (
                  <Badge variant={ROLE_VARIANT[user.role]} sm>
                    {ROLE_LABELS[user.role]}
                  </Badge>
                ),
                status: <StatusBadge status={user.status} label={ACCOUNT_LABELS[user.status]} />,
                joined: user.joined,
                last_active: user.last_active,
                actions: (
                  <div className="d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="hh-icon-btn"
                      data-tooltip="View user"
                      aria-label={`View ${user.name}`}
                      onClick={() => setViewing(user)}
                    >
                      <i className="bi bi-eye" aria-hidden="true" />
                    </button>
                    {/* Admins reset themselves from Settings, and the endpoint
                        refuses other admin accounts, so the control is hidden
                        rather than shown and failing on click. */}
                    {user.role !== 'admin' && (
                      <ResetPasswordButton user={user} onDone={handlePasswordReset} />
                    )}
                    <button
                      type="button"
                      className={`hh-icon-btn hh-tip-start ${user.status === 'suspended' ? 'hh-icon-btn-success' : 'hh-icon-btn-danger'}`}
                      data-tooltip={user.status === 'suspended' ? 'Reactivate user' : 'Suspend user'}
                      aria-label={`${user.status === 'suspended' ? 'Reactivate' : 'Suspend'} ${user.name}`}
                      disabled={user.role === 'admin' || pendingId === user.id}
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
              <EmptyState icon="people" title="No users match" text="Try a different search term or role filter." />
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
          subtitle={ROLE_LABELS[viewing?.role]}
          status={viewing ? { value: viewing.status, label: ACCOUNT_LABELS[viewing.status], verified: viewing.verified } : null}
          fields={[
            { label: 'Email', value: viewing?.email },
            { label: 'Phone', value: viewing?.phone },
            { label: 'Headline', value: viewing?.headline },
            { label: 'Location', value: viewing?.location },
            { label: 'Company', value: viewing?.role === 'employer' ? viewing?.company : undefined },
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