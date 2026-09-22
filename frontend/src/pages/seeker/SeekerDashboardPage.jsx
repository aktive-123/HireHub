import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { jobsApi, seekerApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import JobCard from '../../components/ui/JobCard'

const PROFILE_COMPLETION = 75

const STATUS_VARIANT = {
  new: 'secondary',
  reviewing: 'info',
  'under-review': 'info',
  shortlisted: 'primary',
  interview: 'warning',
  offer: 'accent',
  hired: 'success',
  rejected: 'danger',
  withdrawn: 'secondary',
}

const STAT_ICONS = {
  applications: 'bi-file-earmark-text',
  saved_jobs: 'bi-bookmark-heart',
  interview: 'bi-camera-video',
  hired: 'bi-check2-circle',
  active: 'bi-briefcase',
}

export default function SeekerDashboardPage() {
  const { data: dashboard, loading, error, reload } = useApiData(() => seekerApi.dashboard(), [])

  const jobs = useApiData(() => jobsApi.list({ per_page: 50 }), [])

  const recent = useMemo(
    () =>
      (dashboard?.recent_applications ?? []).map((app) => ({
        id: String(app.id).replace(/^app-/, ''),
        job: {
          id: app.job_id,
          slug: app.job_slug,
          title: app.job,
          location: app.location,
          company:
            typeof app.company === 'string' ? { name: app.company } : (app.company ?? {}),
        },
        applied: app.applied,
        status: app.status,
      })),
    [dashboard]
  )

  const recommended = useMemo(
    () => (jobs.data?.items ?? []).filter((j) => j.is_featured).slice(0, 3),
    [jobs.data]
  )

  const stats = useMemo(
    () =>
      (dashboard?.stats ?? []).map((stat) => ({
        ...stat,
        icon: STAT_ICONS[stat.key] || 'bi-clipboard-data',
      })),
    [dashboard]
  )

  if (loading) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <LoadingState text="Loading your dashboard…" />
          </Reveal>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <EmptyState
              icon="exclamation-triangle"
              title="Couldn't load your dashboard"
              text="Something went wrong while fetching your data. Please try again."
              action={
                <button type="button" className="hh-btn hh-btn-outline-primary hh-btn-pill" onClick={() => reload()}>
                  Try again
                </button>
              }
            />
          </Reveal>
        </div>
      </section>
    )
  }

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
                    recent.map(({ id, job, applied, status }) => (
                      <div className="hh-app-row" key={id}>
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
                          <Link to={`/jobs/${job.slug || job.id}`} className="hh-app-title">
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
                          <Button to={`/seeker/applications/${id}`} variant="outline-primary" size="sm">
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