import { useState } from 'react'
import PageHeader from '../ui/PageHeader'
import TablePagination from '../ui/TablePagination'
import Card from '../ui/Card'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import Alert from '../ui/Alert'
import LoadingState from '../ui/LoadingState'
import { useAdminList } from '../../hooks/useAdminData'

const PAGE_SIZE = 8

// Notification categories are emitted by App\Support\Notifier. They are listed
// here so the tab strip matches what the API can actually filter on; a
// notification with an unknown category still renders, under "Other".
const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'applications', label: 'Applications' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'job-updates', label: 'Job updates' },
  { key: 'account', label: 'Account' },
  { key: 'platform', label: 'Platform' },
]

const CATEGORY_META = {
  applications: { icon: 'briefcase', tone: 'primary' },
  interviews: { icon: 'camera-video', tone: 'info' },
  'job-updates': { icon: 'megaphone', tone: 'warning' },
  account: { icon: 'person-gear', tone: 'success' },
  platform: { icon: 'stars', tone: 'secondary' },
}

/**
 * Shared notifications view for the employer and job-seeker consoles.
 *
 * Both roles read the same Laravel notifications table through their own
 * scoped endpoint and differ only in which api object is passed in, so the
 * filtering, server-side pagination and read receipts live here once instead
 * of being duplicated (and drifting) across two pages.
 *
 * `api` must expose notifications(params), markNotificationRead(id) and
 * markAllNotificationsRead().
 */
export default function NotificationsPanel({ api, eyebrow, subtitle }) {
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(1)
  const [actionError, setActionError] = useState(null)
  const [markingAll, setMarkingAll] = useState(false)

  // Categories are filtered server-side so the pagination total reflects the
  // active filter rather than only the loaded page. The hook expects an
  // `items` key, so the API's nested `notifications` payload is reshaped here.
  const { items: notifications, meta, loading, error, refetch } = useAdminList(
    () =>
      api
        .notifications({
          per_page: PAGE_SIZE,
          page,
          ...(category === 'all' ? {} : { category }),
        })
        .then((res) => ({
          items: res.notifications ?? [],
          meta: { ...res.meta, unread_count: res.unread_count ?? 0 },
        })),
    // No mock rows: the panel renders an empty state rather than fake
    // notifications. An array (not null) is required because the unread
    // count and list length are read before the first response arrives.
    [],
    [page, category]
  )

  // Leaving a filter that no longer has a full page behind it would otherwise
  // strand the user on an empty page.
  const setFilter = (key) => {
    setCategory(key)
    setPage(1)
  }

  const markRead = async (note) => {
    if (!note.unread) return
    setActionError(null)
    try {
      await api.markNotificationRead(note.id)
      // Refetch so the row loses its unread styling and the header count drops
      // immediately, instead of only after a page reload.
      refetch()
    } catch (err) {
      setActionError(err?.message || 'Could not mark that notification as read.')
    }
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    setActionError(null)
    try {
      await api.markAllNotificationsRead()
      refetch()
    } catch (err) {
      setActionError(err?.message || 'Could not mark all notifications as read.')
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = meta?.unread_count ?? notifications.filter((n) => n.unread).length
  const hasUnread = unreadCount > 0

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <PageHeader
          eyebrow={eyebrow}
          title="Notifications"
          subtitle={subtitle}
          action={
            <Button
              type="button"
              variant="outline"
              icon="bi-check2-all"
              pill
              onClick={markAllRead}
              disabled={!hasUnread || markingAll}
            >
              {markingAll ? 'Marking…' : 'Mark all as read'}
            </Button>
          }
        />

        {actionError ? (
          <div className="hh-mb-3">
            <Alert variant="danger" onDismiss={() => setActionError(null)} dismissible>
              {actionError}
            </Alert>
          </div>
        ) : null}

        <div className="hh-tabs hh-mb-4" role="tablist" aria-label="Filter notifications by category">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={category === cat.key}
              className={`hh-tab ${category === cat.key ? 'is-active' : ''}`}
              onClick={() => setFilter(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingState text="Loading notifications…" />
        ) : error ? (
          <Alert variant="danger">{error.message}</Alert>
        ) : notifications.length > 0 ? (
          <>
            <Card className="hh-card-body">
              {notifications.map((note) => {
                const noteMeta = CATEGORY_META[note.category] || CATEGORY_META.platform
                return (
                  <div className={`hh-note-item ${note.unread ? 'is-unread' : ''}`} key={note.id}>
                    <span className={`hh-note-icon hh-note-icon-${noteMeta.tone}`} aria-hidden="true">
                      <i className={`bi bi-${note.icon || noteMeta.icon}`} />
                    </span>
                    <div className="hh-note-content">
                      <p className="hh-note-text">{note.text}</p>
                      <div className="hh-note-time">{note.time}</div>
                    </div>
                    {note.unread ? <span className="hh-note-dot" aria-hidden="true" /> : null}
                    <div className="hh-app-action">
                      {/*
                        A notification's call to action is a navigation, so the
                        link is the control. Nesting a <button> inside the
                        anchor would be invalid HTML, so the read receipt rides
                        along on the link's own click instead.
                      */}
                      {note.link ? (
                        <Button to={note.link} variant="outline" size="sm" onClick={() => markRead(note)}>
                          {note.action || 'View'}
                        </Button>
                      ) : note.unread ? (
                        <Button variant="outline" size="sm" onClick={() => markRead(note)}>
                          Mark as read
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </Card>

            <TablePagination
              page={page}
              pageSize={PAGE_SIZE}
              total={meta?.total ?? notifications.length}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            icon="bell-slash"
            title="No notifications here"
            text={
              category === 'all'
                ? 'Activity on your account will appear here.'
                : 'No notifications in this category yet.'
            }
          />
        )}
      </div>
    </section>
  )
}
