import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'

const CATEGORIES = ['all', 'applications', 'interviews', 'job-updates', 'account', 'platform']

const CATEGORY_META = {
  applications: { icon: 'briefcase', tone: 'primary' },
  interviews: { icon: 'camera-video', tone: 'info' },
  'job-updates': { icon: 'megaphone', tone: 'warning' },
  account: { icon: 'person-gear', tone: 'success' },
  platform: { icon: 'stars', tone: 'secondary' },
}

const SAMPLE_NOTIFICATIONS = [
  { id: 'n1', category: 'applications', text: 'Your application for Senior Frontend Developer at Google has been shortlisted.', action: 'View application', link: '/seeker/applications/job-1', time: '2 hours ago', unread: true },
  { id: 'n2', category: 'interviews', text: 'You have an interview scheduled for UI/UX Designer at Flutterwave.', action: 'View interview', link: '/seeker/notifications', time: 'Yesterday', unread: true },
  { id: 'n3', category: 'job-updates', text: 'Data Analyst at Paystack is closing soon. Apply before it is removed.', action: 'View job', link: '/jobs/job-5', time: '2 days ago', unread: false },
  { id: 'n4', category: 'applications', text: 'Your application for Backend Developer at Microsoft is under review.', action: 'View application', link: '/seeker/applications/job-2', time: '3 days ago', unread: false },
  { id: 'n5', category: 'account', text: 'Your profile was viewed 12 times this week. Keep it up to date.', action: 'View profile', link: '/seeker/profile', time: '4 days ago', unread: false },
  { id: 'n6', category: 'platform', text: 'Welcome to HireHub! Complete your profile to get discovered by employers.', action: 'Complete profile', link: '/seeker/profile/edit', time: 'June 1', unread: false },
]

export default function SeekerNotificationsPage() {
  const [category, setCategory] = useState('all')
  const [read, setRead] = useState(() => new Set(SAMPLE_NOTIFICATIONS.filter((n) => n.unread).map((n) => n.id)))

  const visible = useMemo(
    () =>
      category === 'all'
        ? SAMPLE_NOTIFICATIONS
        : SAMPLE_NOTIFICATIONS.filter((n) => n.category === category),
    [category]
  )

  const unread = (id) => read.has(id)
  const markRead = (id) => setRead((prev) => new Set(prev).add(id))
  const markAllRead = () => setRead(new Set(SAMPLE_NOTIFICATIONS.map((n) => n.id)))
  const hasUnread = SAMPLE_NOTIFICATIONS.some((n) => !read.has(n.id))

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <div className="hh-toolbar hh-toolbar-between hh-mb-4">
            <SectionHeading
              eyebrow="JOB SEEKER DASHBOARD"
              title="Notifications"
              subtitle="Stay on top of application updates, interviews, and account activity."
            />
            <Button type="button" variant="outline-primary" icon="bi-check2-all" pill onClick={markAllRead} disabled={!hasUnread}>
              Mark all as read
            </Button>
          </div>

          <div className="hh-tabs hh-mb-4" role="tablist" aria-label="Filter notifications by category">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={category === cat}
                className={`hh-tab ${category === cat ? 'is-active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat === 'all' ? 'All' : cat.replace('-', ' ')}
              </button>
            ))}
          </div>

          <Reveal>
            {visible.length > 0 ? (
              <Card className="hh-card-body">
                {visible.map((note) => {
                  const meta = CATEGORY_META[note.category] || CATEGORY_META.platform
                  const isUnread = unread(note.id)
                  return (
                    <div className={`hh-note-item ${isUnread ? 'is-unread' : ''}`} key={note.id}>
                      <span className={`hh-note-icon hh-note-icon-${meta.tone}`} aria-hidden="true">
                        <i className={`bi bi-${meta.icon}`} />
                      </span>
                      <div className="hh-note-content">
                        <p className="hh-note-text">{note.text}</p>
                        <div className="hh-note-time">{note.time}</div>
                      </div>
                      {isUnread && <span className="hh-note-dot" aria-hidden="true" />}
                      <div className="hh-app-action ms-2">
                        <Link to={note.link}>
                          <Button variant="outline-primary" size="sm" onClick={() => markRead(note.id)}>
                            {note.action}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </Card>
            ) : (
              <EmptyState
                icon="bell-slash"
                title="No notifications here"
                text="Notifications in this category will appear here."
              />
            )}
          </Reveal>
        </div>
      </section>
    </>
  )
}