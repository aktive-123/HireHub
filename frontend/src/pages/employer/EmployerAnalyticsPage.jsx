import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { employerApi } from '../../services/api'
import { usePlanUsage } from '../../context/PlanUsageContext'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import LoadingState from '../../components/ui/LoadingState'
import EmptyState from '../../components/ui/EmptyState'
import Reveal from '../../components/ui/Reveal'

const FUNNEL_COPY = {
  new: 'Applied',
  reviewing: 'Reviewing',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}

const FUNNEL_TONE = {
  new: 'bg-secondary',
  reviewing: 'bg-info',
  shortlisted: 'bg-primary',
  interview: 'bg-secondary',
  offer: 'bg-warning',
  hired: 'bg-success',
}

function Trend({ points }) {
  // Bars are scaled against the busiest month, so the shape of the trend is
  // readable without a charting dependency. A single flat zero would divide by
  // zero, hence the floor of 1.
  const peak = Math.max(1, ...points.map((p) => p.value))

  return (
    <div>
      <div className="d-flex align-items-end gap-2" style={{ height: '140px' }} role="img" aria-label="Applications received each month">
        {points.map((point) => (
          <div className="flex-fill d-flex flex-column align-items-center justify-content-end h-100" key={point.label}>
            <span className="small fw-semibold mb-1">{point.value}</span>
            <div
              className="w-100 rounded-top"
              style={{ height: `${(point.value / peak) * 100}%`, minHeight: point.value > 0 ? '3px' : '1px' }}
              title={`${point.label}: ${point.value} applications`}
            />
          </div>
        ))}
      </div>
      <div className="d-flex gap-2 mt-2">
        {points.map((point) => (
          <span className="flex-fill small text-secondary text-center" key={point.label}>
            {point.label.split(' ')[0]}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Hiring analytics for the employer's own jobs.
 *
 * Access is gated on the server: the route carries the `plan:analytics`
 * middleware, so a plan without the entitlement never returns data — the
 * upgrade prompt here is a response to that refusal, not a local guess at who
 * may look. Every number is an aggregate over the company's own rows.
 */
export default function EmployerAnalyticsPage() {
  const { showUpgradeNotice, grants } = usePlanUsage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [months, setMonths] = useState(6)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const payload = await employerApi.analytics({ months })
        if (!active) return
        setData(payload)
      } catch (err) {
        if (!active) return
        if (showUpgradeNotice(err)) {
          setData(null)
        } else {
          setError(err?.message || 'We could not load your analytics.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [months, showUpgradeNotice])

  const totals = data?.totals

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <PageHeader
          eyebrow="EMPLOYER"
          title="Hiring analytics"
          subtitle="How your postings and applications are performing."
          action={
            <div className="btn-group" role="group" aria-label="Time range">
              {[3, 6, 12].map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`btn btn-sm ${months === option ? 'btn-primary' : 'btn-outline-primary'}`}
                  aria-pressed={months === option}
                  onClick={() => setMonths(option)}
                >
                  {option} mo
                </button>
              ))}
            </div>
          }
        />

        {/* Stated up front so the restriction is never a surprise on click. */}
        {!grants('analytics') && !data && (
          <div className="alert alert-light border d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span className="small mb-0">
              <i className="bi bi-lock me-1" aria-hidden="true" />
              Analytics is available on paid plans. Upgrade to see your hiring funnel and trends.
            </span>
            <Link to="/employer/billing" className="btn btn-sm btn-primary">
              Upgrade plan
            </Link>
          </div>
        )}

        {loading ? (
          <LoadingState text="Crunching your hiring data…" />
        ) : error ? (
          <EmptyState icon="exclamation-triangle" title="Analytics unavailable" text={error} />
        ) : data ? (
          <>
            <div className="row g-3 hh-mb-4">
              {[
                ['Applications', totals.applications],
                ['Hires', totals.hired],
                ['Hire rate', `${totals.hire_rate}%`],
                ['Median days to hire', totals.median_days_to_hire ?? '—'],
                ['Job views', totals.total_job_views],
              ].map(([label, value]) => (
                <div className="col-6 col-lg-4 col-xl" key={label}>
                  <Card className="hh-stat-card">
                    <div className="hh-stat-value">{value}</div>
                    <div className="hh-stat-label">{label}</div>
                  </Card>
                </div>
              ))}
            </div>

            <div className="row g-4">
              <div className="col-12 col-lg-7">
                <Card className="hh-card-body">
                  <h2 className="h6 fw-bold mb-3">Applications over time</h2>
                  <Trend points={data.applications_trend} />
                </Card>
              </div>

              <div className="col-12 col-lg-5">
                <Card className="hh-card-body hh-mb-4">
                  <h2 className="h6 fw-bold mb-3">Hiring funnel</h2>
                  {data.funnel.every((stage) => stage.value === 0) ? (
                    <p className="small text-secondary mb-0">No applications to chart yet.</p>
                  ) : (
                    data.funnel.map((stage) => (
                      <div className="mb-2" key={stage.status}>
                        <div className="d-flex justify-content-between small mb-1">
                          <span>{FUNNEL_COPY[stage.status] ?? stage.status}</span>
                          <span className="fw-semibold">{stage.value}</span>
                        </div>
                        <div className="progress" style={{ height: '5px' }}>
                          <div
                            className={`progress-bar ${FUNNEL_TONE[stage.status] ?? 'bg-primary'}`}
                            style={{
                              width: `${(stage.value / Math.max(1, totals.applications)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </Card>

                <Card className="hh-card-body">
                  <h2 className="h6 fw-bold mb-3">Top performing jobs</h2>
                  {data.top_jobs.length === 0 ? (
                    <p className="small text-secondary mb-0">Post a job to start measuring performance.</p>
                  ) : (
                    <ul className="list-unstyled small mb-0">
                      {data.top_jobs.map((job) => (
                        <li className="d-flex justify-content-between py-2 border-bottom" key={job.id}>
                          <Link to={`/employer/jobs/${job.slug}`} className="text-truncate me-2">
                            {job.title}
                          </Link>
                          <span className="text-secondary flex-shrink-0">
                            {job.applications_count} app · {job.view_count} views
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
