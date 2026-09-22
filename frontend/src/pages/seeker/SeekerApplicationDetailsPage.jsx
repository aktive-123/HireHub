import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { seekerApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import { formatSalaryAmount, formatSalaryPeriod } from '../../utils/jobs'

const STAGES = [
  { key: 'applied', label: 'Application Submitted' },
  { key: 'under-review', label: 'Application Under Review' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
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

const STATUS_DATE = {
  applied: 'September 12',
  'under-review': 'September 14',
  shortlisted: 'September 16',
  interview: 'September 21',
  offer: 'September 28',
}

export default function SeekerApplicationDetailsPage() {
  const { id } = useParams()
  const { data: application, loading, error, reload } = useApiData(
    () => seekerApi.application(id),
    [id]
  )

  const job = useMemo(() => {
    const app = application || {}
    return {
      ...app,
      title: app.job,
      location: app.location,
      employment_type: app.employment_type || 'Full-time',
      workplace: app.workplace || 'On-site',
      salary: app.salary ?? null,
      category: app.category || 'General',
      company:
        typeof app.company === 'string' ? { name: app.company } : (app.company ?? {}),
    }
  }, [application])

  const status = application?.status || ''
  const stageIndex = Math.max(0, STAGES.findIndex((s) => s.key === status))
  const isHired = status === 'hired'
  const isRejected = status === 'rejected'

  const timeline = STAGES.map((stage, idx) => {
    let state = 'is-pending'
    if (idx < stageIndex) state = 'is-complete'
    if (idx === stageIndex && !isHired && !isRejected) state = 'is-current'
    if (isHired && idx === STAGES.length - 1) state = 'is-complete'
    return { ...stage, state }
  })

  if (loading) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <LoadingState text="Loading application…" />
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
              title="Couldn't load this application"
              text="Something went wrong while fetching this application. Please try again."
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
            <SectionHeading
              eyebrow="JOB SEEKER DASHBOARD"
              title="Application details"
              subtitle="Review your application and follow its progress."
            />
          </Reveal>

          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <Reveal>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-app-row hh-p-0">
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
                      <span className="hh-app-title">{job.title}</span>
                      <div className="hh-app-company">{job.company?.name}</div>
                      <div className="hh-app-meta">
                        <span><i className="bi bi-geo-alt hh-me-1" aria-hidden="true" />{job.location}</span>
                        <span><i className="bi bi-clock hh-me-1" aria-hidden="true" />Full-time</span>
                      </div>
                    </div>
                    <div className="hh-app-action">
                      <Badge variant={STATUS_VARIANT[status] || 'secondary'}>
                        {status.replace('-', ' ')}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={60}>
                <Card className="hh-card-body">
                  <div className="hh-card-title-md hh-mb-4">Application timeline</div>
                  <ol className="hh-timeline">
                    {timeline.map((stage) => (
                      <li className={`hh-timeline-item ${stage.state}`} key={stage.key}>
                        <span className="hh-timeline-marker" aria-hidden="true" />
                        <div className="hh-timeline-title">{stage.label}</div>
                        {stage.state === 'is-current' && (
                          <div className="hh-timeline-desc">This is where your application currently stands.</div>
                        )}
                        {stage.state !== 'is-pending' && STATUS_DATE[stage.key] && (
                          <div className="hh-timeline-meta">{STATUS_DATE[stage.key]}</div>
                        )}
                      </li>
                    ))}
                  </ol>
                </Card>
              </Reveal>
            </div>

            <div className="col-12 col-lg-4">
              <Reveal delay={120}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-card-title-md hh-mb-3">Role snapshot</div>
                  <ul className="hh-meta-list">
                    <li><i className="bi bi-briefcase" aria-hidden="true" /><span>{job.employment_type || 'Full-time'}</span></li>
                    <li><i className="bi bi-laptop" aria-hidden="true" /><span>{job.workplace || 'On-site'}</span></li>
                    <li><i className="bi bi-cash-stack" aria-hidden="true" /><span>{formatSalaryAmount(job.salary)} · {formatSalaryPeriod(job.salary)}</span></li>
                    <li><i className="bi bi-tag" aria-hidden="true" /><span>{job.category || 'General'}</span></li>
                  </ul>
                </Card>
              </Reveal>

              <Reveal delay={180}>
                <Card className="hh-card-body">
                  <div className="hh-card-title-md hh-mb-3">What's next?</div>
                  {status === 'interview' ? (
                    <p className="hh-settings-desc hh-mb-4">Your interview has been scheduled. Review the details and confirm your availability.</p>
                  ) : status === 'offer' ? (
                    <p className="hh-settings-desc hh-mb-4">Congratulations! An offer is waiting. Review the terms and respond before the deadline.</p>
                  ) : status === 'hired' ? (
                    <p className="hh-settings-desc hh-mb-4">You're hired. The employer will reach out with onboarding details.</p>
                  ) : (
                    <p className="hh-settings-desc hh-mb-4">Keep this application moving by staying responsive to employer messages.</p>
                  )}
                  <div className="d-flex flex-column gap-2">
                    {status === 'interview' && (
                      <Button to="/seeker/notifications" variant="primary" icon="bi-camera-video" block pill>
                        View interview details
                      </Button>
                    )}
                    {status === 'offer' && (
                      <Button to="/seeker/notifications" variant="primary" icon="bi-check-lg" block pill>
                        Respond to offer
                      </Button>
                    )}
                    <Button to={`/jobs/${job.job_slug || job.job_id}`} variant="outline-primary" icon="bi-eye" block pill>
                      View job posting
                    </Button>
                  </div>
                </Card>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}