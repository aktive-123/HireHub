import { Link } from 'react-router-dom'
import { usePlanUsage } from '../../context/PlanUsageContext'

/**
 * The allowance most likely to run out, shown next to "Billing & Plan".
 *
 * Renders nothing at all while the plan is loading or could not be read, so the
 * sidebar never shows a "0 of 0" that would read as a real restriction when it
 * is really just an unanswered request. The count comes from the server's usage
 * block; it is not recomputed from anything the browser knows.
 */
export default function PlanUsageIndicator() {
  const { plan, loading, error, canPostJob } = usePlanUsage()

  const jobs = plan?.usage?.job_posts
  if (!jobs || loading || error) return null

  const remaining = Math.max(0, jobs.remaining ?? 0)
  // Warn before the wall, not at it: an employer should learn the limit is
  // close while there is still time to act on it.
  const tone = remaining === 0 ? 'danger' : remaining <= 2 ? 'warning' : 'muted'
  const label = remaining === 0 ? 'No job posts left' : `${remaining} of ${jobs.limit} job posts left`

  return (
    <span className="ms-auto d-inline-flex align-items-center gap-2">
      {remaining === 0 && !canPostJob && (
        <span className="hh-badge hh-badge-danger">Upgrade</span>
      )}
      <span
        className={`small text-${tone}`}
        // A plain <span> carries no semantics, so the count is announced
        // explicitly rather than being read as part of the link text.
        role="status"
        aria-live="polite"
        title={label}
      >
        <i className="bi bi-briefcase me-1" aria-hidden="true" />
        {remaining}/{jobs.limit}
        <span className="visually-hidden"> — {label}</span>
      </span>
    </span>
  )
}

/**
 * A fuller plan summary for the billing page header. Kept separate from the
 * sidebar dot so the two can differ in density without duplicating the fetch.
 */
export function PlanUsageSummary() {
  const { plan, loading, error } = usePlanUsage()

  if (loading && !plan) return <p className="text-secondary small mb-0">Loading your plan…</p>
  if (error) return <p className="text-danger small mb-0">{error}</p>
  if (!plan) return null

  const period = plan.period_ends_at ? new Date(plan.period_ends_at).toLocaleDateString() : null

  return (
    <p className="text-secondary small mb-0">
      <span>
        On the <strong>{plan.plan?.name}</strong> plan
        {period ? ` until ${period}` : ''}
        {plan.is_cancelling ? ' — it will not renew' : ''}.
      </span>{' '}
      <Link to="/employer/billing">Manage your plan</Link>
    </p>
  )
}

