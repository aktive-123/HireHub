import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { usePlanUsage, USAGE_LABELS } from '../../context/PlanUsageContext'

const RESOURCE_COPY = {
  job_post: {
    title: 'You have reached your job post limit',
    body: 'Upgrade your plan to post more jobs, keep featuring them, and unlock CV downloads.',
  },
  featured_job: {
    title: 'You have used all your featured slots',
    body: 'Featured jobs sit at the top of the job board. Upgrade to highlight more of them at once.',
  },
  cv_view: {
    title: 'You have used all your CV views this month',
    body: 'Your CV allowance resets at the start of each month. Upgrade for more, or wait for the reset.',
  },
  feature: {
    title: 'This is not included in your plan',
    body: 'Your current plan does not include this feature. Upgrade to switch it on.',
  },
}

/**
 * The upgrade prompt shown when the API refuses a request for a plan reason.
 *
 * It is opened only by `showPaywall`/`showUpgradeNotice`, which fire solely
 * from a 403 whose body carries `plan_limit_reached` or `plan_upgrade_required`.
 * Nothing here decides a limit was reached — it is told. The numbers rendered
 * below are the server's, taken from the same refusal.
 */
export default function PlanPaywallModal() {
  const { paywall, closePaywall, currentPlan } = usePlanUsage()

  // Browsers restore scroll position on back-navigation, which can leave the
  // page pinned to the footer when a paywall interrupts a long form.
  useEffect(() => {
    if (!paywall) return
    const previous = document.activeElement
    return () => {
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true })
    }
  }, [paywall])

  if (!paywall) return null

  const copy = RESOURCE_COPY[paywall.resource] ?? RESOURCE_COPY.feature
  const usage = paywall.usage?.usage ?? null
  const planName = paywall.usage?.plan?.name ?? currentPlan?.name

  // Show the allowance the user just exhausted. Derived from `resource` rather
  // than a separate map so the modal names the same key the API reports on.
  const blockedKey =
    paywall.resource === 'featured_job'
      ? 'featured'
      : paywall.resource === 'cv_view'
        ? 'cv_views'
        : 'job_posts'
  const blocked = usage?.[blockedKey]

  return (
    <Modal
      isOpen
      onClose={closePaywall}
      title={copy.title}
      footer={
        <>
          <Button variant="outline-secondary" onClick={closePaywall}>
            Not now
          </Button>
          <Link to="/employer/billing" className="btn btn-primary" onClick={closePaywall}>
            View plans
          </Link>
        </>
      }
    >
      <p className="text-secondary mb-3">{copy.body}</p>

      {paywall.message && (
        <p className="alert alert-warning py-2 small mb-3" role="status">
          {paywall.message}
        </p>
      )}

      {blocked && (
        <div className="border rounded-3 p-3 mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-semibold">{USAGE_LABELS[blockedKey] ?? 'Allowance'}</span>
            <span className="small text-secondary">
              {blocked.used} of {blocked.limit} used
              {planName ? ` on ${planName}` : ''}
            </span>
          </div>

          <div
            className="progress"
            role="progressbar"
            aria-label={USAGE_LABELS[blockedKey] ?? 'Allowance'}
            aria-valuenow={blocked.used}
            aria-valuemin={0}
            aria-valuemax={blocked.limit}
            style={{ height: '6px' }}
          >
            <div
              className="progress-bar bg-danger"
              style={{
                width: `${Math.min(100, blocked.limit ? (blocked.used / blocked.limit) * 100 : 0)}%`,
              }}
            />
          </div>
        </div>
      )}

      <p className="small text-secondary mb-0">
        Your current plan stays active until the end of the period you have already paid for, so nothing you
        have published is taken down.
      </p>
    </Modal>
  )
}
