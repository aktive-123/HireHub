import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { adminNotifications } from '../../data/admin'

export default function AdminNotificationBell() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(
    adminNotifications.filter((notification) => notification.unread).length
  )
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const markAllRead = () => {
    setUnread(0)
    setOpen(false)
  }

  return (
    <div className="hh-notif" ref={ref}>
      <button
        type="button"
        className="hh-topbar-icon hh-tip-bottom"
        data-tooltip="Notifications"
        aria-label={`Notifications (${unread} unread)`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <i className="bi bi-bell" aria-hidden="true" />
        {unread > 0 && <span className="hh-notif-count">{unread}</span>}
      </button>

      {open && (
        <div className="hh-notif-panel" role="dialog" aria-label="Notifications">
          <div className="hh-notif-head">
            <span className="hh-fw-bold text-secondary">Notifications</span>
            <button type="button" className="hh-notif-clear" onClick={markAllRead}>
              Mark all read
            </button>
          </div>
          <div className="hh-notif-list">
            {adminNotifications.slice(0, 5).map((notification) => (
              <div
                className={`hh-note-item ${notification.unread ? 'is-unread' : ''}`}
                key={notification.id}
              >
                <span className={`hh-note-icon hh-note-icon-${notification.type}`}>
                  <i className={`bi bi-${notification.icon}`} aria-hidden="true" />
                </span>
                <div className="hh-note-content">
                  <p className="hh-note-text hh-mb-1">{notification.text}</p>
                  <span className="hh-note-time">{notification.time}</span>
                </div>
              </div>
            ))}
          </div>
          <Link to="/admin/activity-logs" className="hh-notif-link" onClick={() => setOpen(false)}>
            View all activity logs
          </Link>
        </div>
      )}
    </div>
  )
}