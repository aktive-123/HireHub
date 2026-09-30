import { Link } from 'react-router-dom'
import Card from '../ui/Card'
import { usePlanUsage, USAGE_LABELS } from '../../context/PlanUsageContext'

const ORDER = ['job_posts', 'featured', 'cv_views']

function Meter({ label, meter }) {
  const remaining = Math.max(0, meter.remaining ?? 0)
  const ratio = meter.limit > 0 ? Math.min(1, meter.used / meter.limit) : 1
  const tone = ratio >= 1 ? 'bg-danger' : ratio >= 0.8 ? 'bg-warning' : 'bg-primary'

  return (
    <div>
      <div className="d-flex justify-content-between align-items-baseline mb-1">
        <span className="small text-secondary">{label}</span>
        <span className="small fw-semibold">
          {meter.used} / {meter.limit}
        </span>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-label={label}
        aria-valuenow={meter.used}
        aria-valuemin={0}
        aria-valuemax={meter.limit}
        aria-valuetext={`${meter.used} of ${meter.limit} used, ${remaining} remaining`}
        style={{ height: '5px' }}
      >
        <div className={`progress-bar ${tone}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="small text-secondary mt-1">
        {remaining === 0 ? 'None left' : `${remaining} remaining`}
      </div>
    </div>
  )
}

/**
 * The employer's plan and what it has consumed, on the dashboard.
 *
 * Reads the shared `PlanUsageProvider` rather than fetching: the dashboard
 * response also carries a usage block, but rendering a second independent copy
 * is what lets two panels disagree after a post. One fetch, one truth.
 */
export default function PlanStatusCard() {
  const { plan, loading, error, refresh, currentPlan } = usePlanUsage()

  if (loading && !plan) {
    return (
      <Card className="hh-card-body hh-mb-4">
        <p className="text-secondary small mb-0">Loading your plan…</p>
      </Card>
    )
  }

  // An employer with no company yet has no plan to report. Say so plainly
  // rather than showing empty meters, which would look like a zero allowance.
  if (error && !plan) {
    return (
      <Card className="hh-card-body hh-mb-4">
        <p className="text-secondary small mb-0">{error}</p>
      </Card>
    )
  }

  if (!plan) return null

  const usage = plan.usage ?? {}
  const isFree = Boolean(currentPlan?.is_free)
  const expiringSoon =
    plan.period_ends_at && new Date(plan.period_ends_at) - Date.now() < 7 * 24 * 60 * 60 * 1000

  return (
    <Card className="hh-card-body hh-mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h2 className="h6 fw-bold mb-1">Your plan</h2>
          <p className="small text-secondary mb-0">
            {currentPlan?.name}
            {isFree ? ' — free forever' : currentPlan?.price_display ? ` — ${currentPlan.price_display} per month` : ''}
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Manual reload: the provider normally updates itself from the write
              responses, so this is for the case where a payment confirmed in a
              different tab while this one sat idle. */}
          <button
            type="button"
            className="btn btn-sm btn-link link-secondary"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh plan usage"
          >
            <i className="bi bi-arrow-clockwise" aria-hidden="true" />
          </button>
          <Link to="/employer/billing" className="btn btn-sm btn-primary">
            {isFree ? 'Upgrade plan' : 'Manage plan'}
          </Link>
        </div>
      </div>

      <div className="row g-3">
        {ORDER.filter((key) => usage[key]).map((key) => (
          <div className="col-12 col-md-4" key={key}>
            <Meter label={USAGE_LABELS[key]} meter={usage[key]} />
          </div>
        ))}
      </div>

      {plan.is_cancelling && (
        <p className="small text-secondary mt-3 mb-0">
          <i className="bi bi-info-circle me-1" aria-hidden="true" />
          Your plan is set to cancel and will not renew. Your allowances stay active until{' '}
          {plan.period_ends_at ? new Date(plan.period_ends_at).toLocaleDateString() : 'the end of the period'}.
        </p>
      )}

      {!plan.is_cancelling && expiringSoon && !isFree && (
        <p className="small text-warning mt-3 mb-0">
          <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
          Your plan renews on {new Date(plan.period_ends_at).toLocaleDateString()}.{' '}
          <Link to="/employer/billing">Review your billing</Link>
        </p>
      )}
    </Card>
  )
}
