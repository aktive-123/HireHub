import { Link } from 'react-router-dom'
import AdminStatGrid from '../../components/admin/AdminStatGrid'
import UserCell from '../../components/admin/UserCell'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Reveal from '../../components/ui/Reveal'
import DashboardHero from '../../components/ui/DashboardHero'
import welcomeImage from '../../assets/dashboard.png'
import {
  adminStats,
  adminApplications,
  adminJobs,
  activityLogs,
  MODERATION_LABELS,
  MODERATION_VARIANT,
} from '../../data/admin'
import { STATUS_LABEL, STATUS_VARIANT } from '../../data/applicants'

const TYPE_ICONS = {
  success: 'check2-circle',
  danger: 'x-circle',
  warning: 'exclamation-triangle',
  info: 'info-circle',
}

const QUICK_LINKS = [
  { to: '/admin/categories', icon: 'bi-tags', label: 'Categories' },
  { to: '/admin/skills', icon: 'bi-cpu', label: 'Skills' },
  { to: '/admin/reports', icon: 'bi-graph-up', label: 'Reports' },
  { to: '/admin/activity-logs', icon: 'bi-journal-text', label: 'Activity Logs' },
  { to: '/admin/settings', icon: 'bi-sliders', label: 'Platform Settings' },
]

export default function AdminDashboardPage() {
  const queue = adminJobs.filter((job) => job.status !== 'published')
  const recentApps = adminApplications.slice(0, 5)
  const recentActivity = activityLogs.slice(0, 5)

  return (
    <section className="hh-section-space hh-section-space--close bg-white">
      <div className="page-container">
        <DashboardHero
          eyebrow="WELCOME BACK,"
          title="Sarah 👋"
          subtitle="Here's what's happening across HireHub today — review pending jobs, recent applications and platform growth."
          cta={{ to: '/admin/users', label: 'Invite team member', icon: 'plus-lg' }}
          image={welcomeImage}
          tagline="Great People. Build Great Companies."
        />

        <AdminStatGrid stats={adminStats} cols={4} />

        <div className="row g-4 hh-mb-4">
          <div className="col-12 col-lg-8">
            <Reveal>
              <Card className="hh-card-body hh-card-hover">
                <div className="hh-toolbar hh-toolbar-between hh-mb-3">
                  <h3 className="hh-card-title-md hh-mb-0">Recent applications</h3>
                  <Button to="/admin/applications" variant="ghost" size="sm" icon="bi-arrow-right" iconPosition="right">
                    View all
                  </Button>
                </div>
                <div className="table-responsive">
                  <table className="hh-table hh-table-hover hh-mb-0">
                    <thead>
                      <tr>
                        <th>Applicant</th>
                        <th>Applied for</th>
                        <th className="hh-table-col-center">Match</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentApps.map((app) => (
                        <tr key={app.id}>
                          <td>
                            <UserCell name={app.applicant} meta={app.email} />
                          </td>
                          <td>
                            <span className="hh-fw-medium">{app.job}</span>
                            <span className="text-muted d-block small">{app.company}</span>
                          </td>
                          <td className="hh-table-col-center">
                            <Badge variant="info" sm>{app.match}%</Badge>
                          </td>
                          <td>
                            <Badge variant={STATUS_VARIANT[app.status] || 'secondary'} dot sm>
                              {STATUS_LABEL[app.status]}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </Reveal>
          </div>

          <div className="col-12 col-lg-4">
            <Reveal delay={80}>
              <Card className="hh-card-body hh-card-hover h-100">
                <div className="hh-toolbar hh-toolbar-between hh-mb-3">
                  <h3 className="hh-card-title-md hh-mb-0">Moderation queue</h3>
                  <Badge variant="warning" sm>{queue.length}</Badge>
                </div>
                {queue.length > 0 ? (
                  <div>
                    {queue.map((job) => (
                      <div className="hh-note-item" key={job.id}>
                        <span className={`hh-note-icon hh-note-icon-${job.status === 'flagged' ? 'danger' : 'warning'}`}>
                          <i className="bi bi-file-earmark-text" aria-hidden="true" />
                        </span>
                        <div className="hh-note-content">
                          <p className="hh-note-text hh-mb-1">
                            {job.title}
                            <span className="text-muted"> — {job.company}</span>
                          </p>
                          <span className="hh-note-time">{job.posted}</span>
                        </div>
                        <Badge variant={MODERATION_VARIANT[job.status]} sm>
                          {MODERATION_LABELS[job.status]}
                        </Badge>
                      </div>
                    ))}
                    <Link to="/admin/jobs" className="hh-btn hh-btn-outline-primary hh-btn-sm hh-btn-block hh-mt-3">
                      Open all jobs
                    </Link>
                  </div>
                ) : (
                  <p className="text-muted small hh-mb-0">The moderation queue is clear. Nice work.</p>
                )}
              </Card>
            </Reveal>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <Reveal delay={120}>
              <Card className="hh-card-body hh-card-hover">
                <div className="hh-toolbar hh-toolbar-between hh-mb-3">
                  <h3 className="hh-card-title-md hh-mb-0">Recent activity</h3>
                  <Button to="/admin/activity-logs" variant="ghost" size="sm" icon="bi-arrow-right" iconPosition="right">
                    View logs
                  </Button>
                </div>
                {recentActivity.map((log) => (
                  <div className="hh-note-item" key={log.id}>
                    <span className={`hh-note-icon hh-note-icon-${log.type}`}>
                      <i className={`bi bi-${TYPE_ICONS[log.type] || 'info-circle'}`} aria-hidden="true" />
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
              </Card>
            </Reveal>
          </div>

          <div className="col-12 col-lg-6">
            <Reveal delay={160}>
              <Card className="hh-card-body hh-card-hover h-100">
                <h3 className="hh-card-title-md hh-mb-3">Quick actions</h3>
                <div className="row g-3">
                  {QUICK_LINKS.map(({ to, icon, label }) => (
                    <div className="col-12 col-sm-6" key={to}>
                      <Link to={to} className="hh-quick-link">
                        <i className={`bi ${icon}`} aria-hidden="true" />
                        {label}
                      </Link>
                    </div>
                  ))}
                </div>
              </Card>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}