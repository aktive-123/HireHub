import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import { billingApi, employerApi } from '../../services/api'
import { usePlanUsage } from '../../context/PlanUsageContext'

function formatDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatMoney(amount, currency) {
  if (amount === null || amount === undefined) return null
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount)
  } catch {
    return `${amount} ${currency ?? ''}`.trim()
  }
}

function SubscriptionCard({ subscription, onCancel, cancelling, cancellingAllowed }) {
  if (!subscription) {
    return (
      <Card className="mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h2 className="h5 mb-1">No active subscription</h2>
            <p className="text-muted small mb-0">
              Your account is on the free tier. Choose a plan to raise your job posting and CV view
              limits.
            </p>
          </div>
          <Button to="/pricing" icon="stars">
            View Plans
          </Button>
        </div>
      </Card>
    )
  }

  const { plan, status, status_label: statusLabel, gateway } = subscription
  const periodEnd = formatDate(subscription.current_period_end)
  const isEnding = Boolean(subscription.cancelled_at)

  return (
    <Card className="mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h2 className="h5 mb-1">{plan?.name ?? 'Your plan'}</h2>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <StatusBadge status={status} label={statusLabel} />
            {gateway && <span className="small text-muted text-capitalize">via {gateway}</span>}
          </div>
        </div>

        <div className="text-end">
          {plan?.price_display && <div className="h5 mb-0">{plan.price_display}</div>}
          {plan?.billing_period && plan?.is_free !== true && (
            <div className="small text-muted">per {plan.billing_period.replace(/e$/, '')}</div>
          )}
        </div>
      </div>

      {subscription.on_grace_period && (
        <Alert variant="warning" icon="exclamation-triangle" className="mb-3">
          Your last payment did not go through. Access continues while the payment is retried —
          please update your payment method to avoid losing your plan.
        </Alert>
      )}

      {isEnding ? (
        <Alert variant="info" icon="info-circle" className="mb-3">
          This plan is cancelled and will end{periodEnd ? ` on ${periodEnd}` : ' at the end of the current period'}.
          You keep every entitlement until then, and nothing further will be charged.
        </Alert>
      ) : (
        periodEnd && (
          <p className="small text-muted mb-3">
            Renews on <strong>{periodEnd}</strong>.
          </p>
        )
      )}

      <div className="d-flex flex-wrap gap-2">
        {!isEnding && (
          <Button to="/pricing" variant="outline" size="sm" icon="arrow-repeat">
            Change Plan
          </Button>
        )}
        {!isEnding && cancellingAllowed && (
          <Button variant="ghost" size="sm" icon="x-circle" onClick={onCancel} disabled={cancelling}>
            Cancel Subscription
          </Button>
        )}
      </div>
    </Card>
  )
}

/**
 * The allowance meters, plus the two actions that change a plan: renewing the
 * current one early, or moving to a different one.
 *
 * Reads the shared plan usage rather than fetching a third copy — the
 * subscription, the usage block and the payment history are three views of one
 * account, and two of them disagreeing on screen would be a real defect.
 */
function PlanUsageSection({ onRenew, renewing }) {
  const { plan, loading } = usePlanUsage()

  if (loading && !plan) {
    return (
      <Card className="hh-card-body mt-4">
        <p className="small text-secondary mb-0">Loading your allowance…</p>
      </Card>
    )
  }
  if (!plan) return null

  const isFree = Boolean(plan.plan?.is_free)
  const isEnding = Boolean(plan.is_cancelling)

  return (
    <Card className="hh-card-body mt-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h2 className="h6 fw-bold mb-1">Your allowance</h2>
          <p className="small text-secondary mb-0">
            Counted from your current postings and this month's activity.
          </p>
        </div>

        <div className="d-flex gap-2">
          {/* Renewing early extends the paid period; it is hidden for the free
              tier, which has nothing to renew. */}
          {!isFree && !isEnding && (
            <Button variant="outline" size="sm" icon="arrow-repeat" onClick={onRenew} disabled={renewing}>
              {renewing ? 'Opening checkout…' : 'Renew early'}
            </Button>
          )}
          <Link to="/pricing" className="btn btn-sm btn-primary">
            {isFree ? 'Upgrade' : 'Change plan'}
          </Link>
        </div>
      </div>

      <div className="row g-3">
        {[
          ['Job posts', plan.usage?.job_posts],
          ['Featured slots', plan.usage?.featured],
          ['CV views this month', plan.usage?.cv_views],
        ]
          .filter(([, meter]) => meter)
          .map(([label, meter]) => {
            const ratio = meter.limit > 0 ? Math.min(1, meter.used / meter.limit) : 1
            return (
              <div className="col-12 col-md-4" key={label}>
                <div className="d-flex justify-content-between small mb-1">
                  <span className="text-secondary">{label}</span>
                  <span className="fw-semibold">
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
                  aria-valuetext={`${meter.used} of ${meter.limit} used, ${meter.remaining} remaining`}
                  style={{ height: '5px' }}
                >
                  <div
                    className={`progress-bar ${ratio >= 1 ? 'bg-danger' : ratio >= 0.8 ? 'bg-warning' : 'bg-primary'}`}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
                <div className="small text-secondary mt-1">
                  {meter.remaining === 0 ? 'None left' : `${meter.remaining} remaining`}
                </div>
              </div>
            )
          })}
      </div>
    </Card>
  )
}

export default function EmployerBillingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const checkoutState = searchParams.get('checkout')
  const { syncAfterPayment } = usePlanUsage()

  const [subscription, setSubscription] = useState(null)
  const [payments, setPayments] = useState([])
  const [hiringFees, setHiringFees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    // The subscription is the more important of the two, and an employer
    // without a company profile gets a 403 on both. Loading them together means
    // one clear error instead of two competing ones.
    //
    // Placement fees are loaded alongside them, and allSettled rather than all,
    // so a fee endpoint failure never takes the subscription view down with it.
    const [sub, history, fees] = await Promise.allSettled([
      billingApi.subscription(),
      billingApi.payments({ per_page: 20 }),
      employerApi.hiringFees({ per_page: 20 }),
    ])

    if (sub.status === 'fulfilled') setSubscription(sub.value?.subscription ?? null)
    else setError(sub.reason?.message || 'Could not load your subscription.')

    if (history.status === 'fulfilled') setPayments(history.value?.items ?? [])

    if (fees.status === 'fulfilled') setHiringFees(fees.value?.items ?? [])

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Clear the ?checkout flag once acknowledged, so a refresh does not re-show
  // a success banner for a payment that may have been days ago.
  useEffect(() => {
    if (checkoutState && checkoutState !== 'success') {
      setError(checkoutState === 'cancelled' ? 'Checkout was cancelled. Nothing was charged.' : '')
      searchParams.delete('checkout')
      setSearchParams(searchParams, { replace: true })
    }
  }, [checkoutState, searchParams, setSearchParams])

  const handleCancel = async () => {
    setCancelling(true)
    setError('')
    setNotice('')

    try {
      const res = await billingApi.cancel()
      setSubscription(res?.data ?? res)
      setNotice('Your subscription is cancelled. Access continues until the end of the period.')
      setConfirmOpen(false)
      load()
    } catch (err) {
      setError(err?.message || 'We could not cancel your subscription. Please try again.')
      setConfirmOpen(false)
    } finally {
      setCancelling(false)
    }
  }

  const onCheckoutSuccess = () => {
    setNotice('Payment received. Your new plan is active now — thank you!')
    searchParams.delete('checkout')
    setSearchParams(searchParams, { replace: true })
    // The gateway just confirmed payment, so the allowances elsewhere in the
    // console (sidebar counter, dashboard meters) are stale until re-read.
    syncAfterPayment()
  }

  /**
   * Extend the paid period early. Returns to the gateway's hosted checkout, the
   * same path an upgrade takes, so card details are never collected here.
   */
  const handleRenew = async () => {
    setRenewing(true)
    setError('')
    setNotice('')

    try {
      const res = await billingApi.renew()
      const url = res?.checkout_url
      if (!url) {
        setNotice('Your plan is already set to renew automatically. No extra payment is needed.')
        return
      }
      window.location.href = url
    } catch (err) {
      setError(err?.message || 'We could not start the renewal. Please try again.')
    } finally {
      setRenewing(false)
    }
  }

  useEffect(() => {
    if (checkoutState === 'success') onCheckoutSuccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutState])

  if (loading) {
    return (
      <>
        <PageHeader title="Billing" subtitle="Your plan and payment history." eyebrow="BILLING" />
        <LoadingState label="Loading your billing details…" />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Billing" subtitle="Your plan and payment history." eyebrow="BILLING" />

      {checkoutState === 'success' && (
        <Alert variant="success" icon="check-circle" className="mb-4">
          Payment received. Your new plan is active now — thank you!
        </Alert>
      )}

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {notice && (
        <Alert variant="success" icon="check-circle" className="mb-4">
          {notice}
        </Alert>
      )}

      <SubscriptionCard
        subscription={subscription}
        onCancel={() => setConfirmOpen(true)}
        cancelling={cancelling}
        cancellingAllowed={subscription?.status !== 'cancelled'}
      />

      <PlanUsageSection onRenew={handleRenew} renewing={renewing} />

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 mt-4">
        <h2 className="h5 mb-0">Payment History</h2>
        <Button variant="ghost" size="sm" icon="arrow-clockwise" onClick={load}>
          Refresh
        </Button>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="No payments yet"
          text="Once you upgrade to a paid plan, every charge and receipt will be listed here."
          action={
            <Button to="/pricing" variant="outline" pill className="mt-3" icon="stars">
              View Plans
            </Button>
          }
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Method</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">
                    Receipt
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.reference ?? payment.id}>
                    <td className="text-nowrap">{formatDate(payment.paid_at ?? payment.created_at) ?? '—'}</td>
                    <td>{payment.plan?.name ?? '—'}</td>
                    <td className="text-nowrap">
                      {formatMoney(payment.amount, payment.currency) ?? '—'}
                    </td>
                    <td className="text-capitalize">{payment.gateway_label ?? payment.gateway ?? '—'}</td>
                    <td>
                      <StatusBadge status={payment.status} label={payment.status_label} />
                    </td>
                    <td className="text-end">
                      {payment.checkout_url ? (
                        <a
                          href={payment.checkout_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hh-table-link"
                        >
                          <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                          <span className="visually-hidden">Open receipt for {payment.reference}</span>
                        </a>
                      ) : (
                        <span className="text-muted small text-nowrap">{payment.reference}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {hiringFees.length > 0 && (
        <>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 mt-5">
            <h2 className="h5 mb-0">Placement Fees</h2>
            <span className="small text-muted">Charged when you confirm a hire</span>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Candidate</th>
                    <th scope="col">Job</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-end">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hiringFees.map((fee) => (
                    <tr key={fee.reference ?? fee.id}>
                      <td className="text-nowrap">{formatDate(fee.paid_at ?? fee.created_at) ?? '—'}</td>
                      <td>{fee.candidate ?? '—'}</td>
                      <td>{fee.job ?? '—'}</td>
                      <td className="text-nowrap">{fee.formatted_amount ?? '—'}</td>
                      <td>
                        <StatusBadge status={fee.status} label={fee.status_label} />
                      </td>
                      <td className="text-end">
                        {fee.checkout_url ? (
                          <a
                            href={fee.checkout_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hh-table-link"
                          >
                            <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                            <span className="visually-hidden">Open receipt for {fee.reference}</span>
                          </a>
                        ) : (
                          <span className="text-muted small text-nowrap">{fee.reference}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <p className="small text-muted mt-4 mb-0">
        Need an invoice for a specific charge, or a different payment method?{' '}
        <Link to="/contact" className="hh-auth-link">
          Contact support
        </Link>
      </p>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Cancel your subscription?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={cancelling}>
              Keep my plan
            </Button>
            <Button variant="primary" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel subscription'}
            </Button>
          </>
        }
      >
        <p className="mb-0">
          You will keep every benefit of{' '}
          <strong>{subscription?.plan?.name ?? 'your plan'}</strong> until the end of the current
          billing period, and will not be charged again. Jobs you have already posted stay live
          until then.
        </p>
      </Modal>
    </>
  )
}
