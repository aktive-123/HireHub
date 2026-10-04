import { useCallback, useEffect, useRef, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { employerApi } from '../../services/api'

/**
 * The placement-fee confirmation shown before an employer completes a hire.
 *
 * It is opened only from an API refusal carrying
 * `error_code: 'hiring_fee_required'`, or from an explicit "Pay hiring fee"
 * action. Nothing here decides a fee is owed and nothing here computes a price:
 * the amount, the level and the basis all come from the server's own quote, so
 * the figure the employer approves is provably the figure the gateway charges.
 *
 * The job seeker is never charged, and this modal is only ever mounted on
 * employer-facing routes.
 */
export default function HiringFeeModal({
  isOpen,
  applicationId,
  quote: initialQuote = null,
  justReturned = false,
  onClose,
  onPaid,
}) {
  const [quote, setQuote] = useState(initialQuote)
  const [gateway, setGateway] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)
  // Set once the server confirms the fee settled, so the modal can say so rather
  // than closing and leaving the employer unsure whether the money went through.
  // Paid is not hired: the candidate still has to accept the offer.
  const [paid, setPaid] = useState(false)
  const [hired, setHired] = useState(false)
  const pollRef = useRef(null)

  // A fresh refusal carries its own quote, so it must win over anything left
  // over from a previous open of the same modal.
  useEffect(() => {
    if (isOpen) {
      setQuote(initialQuote)
      setError(null)
      setPaid(false)
      setHired(false)
    }
  }, [isOpen, applicationId, initialQuote])

  const loadQuote = useCallback(async () => {
    if (!applicationId) return
    setChecking(true)
    try {
      setQuote(await employerApi.hiringFeeQuote(applicationId))
      setError(null)
    } catch (err) {
      setError(err?.message || 'Could not load the hiring fee.')
    } finally {
      setChecking(false)
    }
  }, [applicationId])

  // A quote may arrive undefined when the modal is opened from a bare "Pay fee"
  // button rather than from a refusal, so it is fetched on demand.
  useEffect(() => {
    if (isOpen && !quote && applicationId) loadQuote()
  }, [isOpen, quote, applicationId, loadQuote])

  // The gateway redirects back to the applicant page, which passes
  // `justReturned` in; nothing re-fetches on its own, so a short poll picks up a
  // webhook that has not landed yet. `justReturned` arrives as a prop because the
  // page that owns this modal strips `fee_return` from the URL as soon as it has
  // read it, so the flag is not in `window.location` by the time this runs.
  useEffect(() => {
    if (!isOpen || paid || !justReturned || !applicationId) return undefined

    let cancelled = false

    const check = async () => {
      try {
        const result = await employerApi.hiringFeeStatus(applicationId)
        if (cancelled) return

        // Settled, not necessarily hired. Telling the employer the candidate is
        // hired here is how they end up waiting for a start date that needs the
        // candidate's acceptance first.
        if (result?.hiring_fee?.status === 'succeeded') {
          setPaid(true)
          setHired(Boolean(result.hired))
          setQuote((prev) => ({ ...(prev ?? {}), already_paid: true }))
          onPaid?.(result)
        }
      } catch {
        // A failed poll is not a failure of the payment. Keep waiting quietly.
      }
    }

    check()
    pollRef.current = window.setInterval(check, 3000)
    return () => {
      cancelled = true
      window.clearInterval(pollRef.current)
    }
  }, [isOpen, paid, justReturned, applicationId, onPaid])

  useEffect(() => () => window.clearInterval(pollRef.current), [])

  const handlePay = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await employerApi.createHiringFeeCheckout(applicationId, gateway || undefined)
      if (result?.checkout_url) {
        // Hand off to the gateway. The hire completes on its webhook, not here.
        window.location.assign(result.checkout_url)
        return
      }
      setError('The payment provider did not return a checkout link. Please try again.')
    } catch (err) {
      setError(err?.message || 'Could not start the payment. Please try again.')
      setBusy(false)
    }
  }

  const close = () => {
    setBusy(false)
    onClose?.()
  }

  // The server only offers gateways it has keys for, so an empty list means no
  // payment can actually be taken. Say so up front rather than letting the
  // employer press "Pay" and bounce off a gateway error.
  const noGateway = Boolean(quote) && (quote?.gateways?.length ?? 0) === 0

  return (
    <Modal
      isOpen={isOpen}
      // While a checkout is being opened the modal must not be dismissable, or
      // the employer can close it over a payment that is already in flight.
      onClose={busy ? undefined : close}
      title={paid ? (hired ? 'Hire confirmed' : 'Payment received') : 'Confirm the hiring fee'}
      footer={
        paid ? (
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={close} disabled={busy}>
              Not now
            </Button>
            <Button
              variant="primary"
              icon="bi-lock-fill"
              onClick={handlePay}
              disabled={busy || checking || !quote || noGateway}
            >
              {busy
                ? 'Opening checkout…'
                : noGateway
                  ? 'Payment unavailable'
                  : `Pay ${quote?.formatted_amount ?? 'the fee'}`}
            </Button>
          </>
        )
      }
    >
      {paid ? (
        <>
          {hired ? (
            <>
              <div className="alert alert-success mb-3" role="status">
                <i className="bi bi-check-circle-fill me-2" aria-hidden="true" />
                {quote?.candidate ?? 'The candidate'} accepted the offer. The hire is complete and the job has
                been closed to further applications.
              </div>
              <p className="text-secondary mb-0">
                A receipt is available in your hiring fee history.
              </p>
            </>
          ) : (
            <>
              <div className="alert alert-success mb-3" role="status">
                <i className="bi bi-check-circle-fill me-2" aria-hidden="true" />
                Payment received. {quote?.candidate ?? 'The candidate'} has been notified and the offer is now
                waiting on their answer.
              </div>
              <p className="text-secondary mb-0">
                The candidate has until they reply to decide, and the job stays open in the meantime. You will
                be notified as soon as they accept or decline — there is nothing else to do now. A receipt is
                already available in your hiring fee history.
              </p>
            </>
          )}
        </>
      ) : (
        <>
          <p className="text-secondary mb-3">
            {quote?.candidate ? (
              <>
                Hiring <strong>{quote.candidate}</strong> for <strong>{quote.job}</strong> requires a one-off
                placement fee.
              </>
            ) : (
              'This hire requires a one-off placement fee.'
            )}{' '}
            The fee is charged to your company account, never to the candidate.
          </p>

          {checking && !quote && (
            <div className="text-center py-3">
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              Calculating the fee…
            </div>
          )}

          {quote && (
            <div className="border rounded-3 p-3 mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-semibold">{quote.level_label} placement</span>
                <span className="small text-secondary">{quote.currency}</span>
              </div>

              <div className="d-flex justify-content-between align-items-baseline mb-2">
                <span className="text-secondary">Hiring fee</span>
                <span className="fs-5 fw-bold text-dark">{quote.formatted_amount}</span>
              </div>

              {quote.basis === 'percentage' && (
                <p className="small text-secondary mb-0">
                  Priced at 5% of the advertised salary{quote.annual_salary ? ` (${quote.annual_salary.toLocaleString()})` : ''},
                  which is higher than the flat rate for this level.
                </p>
              )}
              {quote.basis === 'flat' && (
                <p className="small text-secondary mb-0">Flat rate for this level.</p>
              )}
            </div>
          )}

          {quote?.already_paid && (
            <div className="alert alert-success py-2 small" role="status">
              This hiring fee has already been paid. The offer is with the candidate.
            </div>
          )}

          {quote?.checkout_url && !paid && (
            <p className="small text-secondary">
              You already have a checkout open for this fee. Choosing “Pay” will take you back to it.
            </p>
          )}

          {(quote?.gateways?.length ?? 0) > 1 && (
            <div className="mb-3">
              <label className="form-label" htmlFor="hh-fee-gateway">
                Payment method
              </label>
              <select
                id="hh-fee-gateway"
                className="form-select"
                value={gateway}
                onChange={(e) => setGateway(e.target.value)}
              >
                {quote.gateways.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {noGateway && (
            <div className="alert alert-warning mb-0" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
              Payments are not available right now, so this hire cannot be confirmed. The candidate stays at
              their current status until you can pay. Please contact HireHub support.
            </div>
          )}

          {error && (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          )}

          <p className="small text-secondary mt-3 mb-0">
            Paying confirms the offer to the candidate. The candidate then accepts or declines, and the hire
            completes when they accept.
          </p>
        </>
      )}
    </Modal>
  )
}
