import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicJobs } from '../../data/jobs'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import JobCard from '../../components/ui/JobCard'

const PROFILE_COMPLETION = 75

const RECENT_APPLICATIONS = [
  { id: 'ap-1', jobId: 'job-1', applied: 'Sep 12', status: 'under-review' },
  { id: 'ap-2', jobId: 'job-5', applied: 'Sep 10', status: 'shortlisted' },
  { id: 'ap-3', jobId: 'job-3', applied: 'Sep 4', status: 'interview' },
  { id: 'ap-4', jobId: 'job-6', applied: 'Aug 28', status: 'applied' },
]

const STATUS_VARIANT = {
  applied: 'secondary',
  'under-review': 'info',
  shortlisted: 'primary',
  interview: 'warning',
  offer: 'accent',
  hired: 'success',
  rejected: 'danger',
}

export default function SeekerDashboardPage() {
  const [savedCount] = useState(9)

  const recent = useMemo(
    () =>
      RECENT_APPLICATIONS.map((app) => {
        const job = publicJobs.find((j) => j.id === app.jobId)
        return { ...app, job }
      }).filter((app) => app.job),
    []
  )

  const recommended = useMemo(
    () => publicJobs.filter((j) => j.is_featured).slice(0, 3),
    []
  )

  const stats = [
    { key: 'applications', label: 'Applications', value: 12, icon: 'bi-file-earmark-text', tone: 'primary' },
    { key: 'saved', label: 'Saved Jobs', value: savedCount, icon: 'bi-bookmark-heart', tone: 'success' },
    { key: 'interviews', label: 'Interviews', value: 3, icon: 'bi-camera-video', tone: 'info' },
    { key: 'views', label: 'Profile Views', value: 124, icon: 'bi-eye', tone: 'warning' },
  ]

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <div className="hh-toolbar hh-toolbar-between hh-mb-4">
              <div className="hh-welcome-id">
                <span className="hh-avatar hh-avatar-soft" aria-hidden="true">SO</span>
                <div>
                  <SectionHeading
                    eyebrow="JOB SEEKER DASHBOARD"
                    title="Welcome back, Sarah"
                    subtitle="Here's what's happening with your job search."
                  />
                </div>
              </div>
              <Button to="/seeker/browse-jobs" variant="primary" icon="bi-search" pill>
                Find jobs
              </Button>
            </div>
          </Reveal>

          <div className="row g-4 hh-mb-5">
            {stats.map((stat, idx) => (
              <div className="col-12 col-sm-6 col-lg-3" key={stat.key}>
                <Reveal delay={idx * 60}>
                  <Card className="hh-stat-card hh-card-hover">
                    <div className={`hh-stat-icon hh-stat-icon-${stat.tone}`}>
                      <i className={`bi ${stat.icon}`} aria-hidden="true" />
                    </div>
                    <div className="hh-stat-value">{stat.value}</div>
                    <div className="hh-stat-label">{stat.label}</div>
                  </Card>
                </Reveal>
              </div>
            ))}
          </div>

          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <Reveal>
                <Card className="hh-card-body">
                  <div className="hh-card-title-md hh-mb-4">Recent applications</div>
                  {recent.length > 0 ? (
                    recent.map(({ job, applied, status }) => (
                      <div className="hh-app-row" key={`${job.id}-${applied}`}>
                        <div
                          className="hh-app-logo"
                          style={{
                            background: job.company?.logoBg || 'var(--hh-bg-soft)',
                            color: job.company?.logoColor || 'var(--hh-primary)',
                          }}
                        >
                          {job.company?.logoText || job.company?.name?.charAt(0)}
                        </div>
                        <div className="hh-app-info">
                          <Link to={`/jobs/${job.id}`} className="hh-app-title">
                            {job.title}
                          </Link>
                          <div className="hh-app-company">{job.company?.name}</div>
                          <div className="hh-app-meta">
                            <span><i className="bi bi-geo-alt hh-me-1" aria-hidden="true" />{job.location}</span>
                            <span><i className="bi bi-clock hh-me-1" aria-hidden="true" />Applied {applied}</span>
                          </div>
                        </div>
                        <div className="hh-app-action">
                          <Badge variant={STATUS_VARIANT[status] || 'secondary'}>
                            {status.replace('-', ' ')}
                          </Badge>
                          <Button to={`/seeker/applications/${job.id}`} variant="outline-primary" size="sm">
                            View
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon="briefcase"
                      title="No applications yet"
                      text="Start applying to jobs that match your skills."
                    />
                  )}
                </Card>
              </Reveal>
            </div>

            <div className="col-12 col-lg-4">
              <Reveal delay={80}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-card-title-md hh-mb-3">Complete your profile</div>
                  <p className="hh-settings-desc">A complete profile is 3× more likely to be viewed by employers.</p>
                  <div className="hh-progress-label hh-mt-4 hh-mb-2">
                    <span>Profile completion</span>
                    <strong>{PROFILE_COMPLETION}%</strong>
                  </div>
                  <div className="hh-progress hh-mb-4" role="progressbar" aria-valuenow={PROFILE_COMPLETION} aria-valuemin="0" aria-valuemax="100">
                    <div className="hh-progress-bar" style={{ width: `${PROFILE_COMPLETION}%` }} />
                  </div>
                  <Button to="/seeker/profile/edit" variant="outline-primary" icon="bi-pencil" block pill>
                    Complete profile
                  </Button>
                </Card>
              </Reveal>

              <Reveal delay={140}>
                <Card className="hh-card-body">
                  <div className="hh-card-title-md hh-mb-3">Quick links</div>
                  <nav className="hh-vert-list" aria-label="Quick actions">
                    <Link to="/seeker/browse-jobs"><i className="bi bi-search hh-me-2" aria-hidden="true" />Browse jobs</Link>
                    <Link to="/seeker/applications"><i className="bi bi-briefcase hh-me-2" aria-hidden="true" />My applications</Link>
                    <Link to="/seeker/saved-jobs"><i className="bi bi-bookmark hh-me-2" aria-hidden="true" />Saved jobs</Link>
                    <Link to="/seeker/resume"><i className="bi bi-file-earmark-person hh-me-2" aria-hidden="true" />CV / Resume</Link>
                    <Link to="/seeker/notifications"><i className="bi bi-bell hh-me-2" aria-hidden="true" />Notifications</Link>
                  </nav>
                </Card>
              </Reveal>
            </div>
          </div>

          <div className="hh-mt-5">
            <div className="hh-toolbar hh-toolbar-between hh-mb-4">
              <SectionHeading
                eyebrow="PERSONALIZED FOR YOU"
                title="Recommended jobs"
                subtitle="Roles matched to your skills and search history."
                centered={false}
              />
              <Button to="/seeker/browse-jobs" variant="outline-primary" icon="bi-arrow-right" iconPosition="right" pill>
                Explore all jobs
              </Button>
            </div>
            <div className="row g-4">
              {recommended.map((job, idx) => (
                <div className="col-12 col-md-6 col-lg-4" key={job.id}>
                  <JobCard job={job} index={idx} featured={false} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}