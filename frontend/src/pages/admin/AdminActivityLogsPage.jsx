import { useState, useMemo } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import TablePagination from '../../components/ui/TablePagination'
import { activityLogs } from '../../data/admin'

const PAGE_SIZE = 8

const TYPE_ICONS = {
  success: 'bi-check2-circle',
  danger: 'bi-x-circle',
  warning: 'bi-exclamation-triangle',
  info: 'bi-info-circle',
}

export default function AdminActivityLogsPage() {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const types = ['all', 'success', 'info', 'warning', 'danger']

  const tabs = types.map((type) => ({
    key: type,
    label: type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1),
    count: type === 'all' ? activityLogs.length : activityLogs.filter((log) => log.type === type).length,
  }))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return activityLogs.filter((log) => {
      const matchesTab = tab === 'all' || log.type === tab
      const matchesQuery =
        !q ||
        log.actor.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        (log.target || '').toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [tab, query])

  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <AdminPageHeader
          eyebrow="ADMIN CONSOLE"
          title="Activity Logs"
          subtitle="An audit trail of every significant action taken on the platform."
        />

        <div className="hh-tabs hh-tabs--pills hh-mb-3" role="tablist" aria-label="Log type">
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
            placeholder="Search by actor, action or target…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            aria-label="Search activity logs"
          />
        </div>

        <Card className="hh-card-body">
          {visible.length > 0 ? (
            <div>
              {visible.map((log) => (
                <div className="hh-note-item" key={log.id}>
                  <span className={`hh-note-icon hh-note-icon-${log.type}`}>
                    <i className={TYPE_ICONS[log.type] || TYPE_ICONS.info} aria-hidden="true" />
                  </span>
                  <div className="hh-note-content">
                    <p className="hh-note-text">
                      <span className="hh-fw-semibold">{log.actor}</span> {log.action}
                      {log.target && (
                        <>
                          {' '}
                          <span className="hh-fw-semibold text-primary">{log.target}</span>
                        </>
                      )}
                    </p>
                    <span className="hh-note-time">{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="journal-text" title="No logs match" text="Try a different search term or log type." />
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