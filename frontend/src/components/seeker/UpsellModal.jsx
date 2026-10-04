import { useEffect, useRef, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { seekerApi } from '../../services/api'

/**
 * A paid add-on a job seeker can buy against a hire they have already accepted.
 *
 * The one product today is a 45-minute mock interview, and it is deliberately
 * offered at exactly one moment: after the seeker accepts an offer. Nothing here
 * decides what is for sale or what it costs — the catalogue and the amount come
 * from `GET /seeker/applications/{id}/upsells`, and the server re-prices from
 * the same source when checkout is opened, so a stale figure in this component
 * cannot become the amount charged.
 *
 * Mounted only on the seeker's own application. The payer is a person, not a
 * company, so none of the employer billing components apply here.
 */
export default function UpsellModal({
  isOpen,
  applicationId,
  items = null,
  justReturned = false,
  onClose,
  onPurchased,
}) {
  const [catalogue, setCatalogue] = useState(items ?? [])
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  // A caller that already has the catalogue (the accept-offer response carries
  // it) hands it in; one that does not fetches it on open.
  useEffect(() => {
    if (isOpen) {
      setCatalogue(items ?? [])
      setError(null)
    }
  }, [isOpen, applicationId, items])

  useEffect(() => {
    if (!isOpen || items || !applicationId) return undefined

    let cancelled = false
    seekerApi
      .upsells(applicationId)
      .then((result) => {
        if (!cancelled) setCatalogue(result)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Could not load the add-ons right now. Please try again.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, items, applicationId])

  const handleBuy = async (product) => {
    setBusy(product.sku)
    setError(null)

    try {
      const result = await seekerApi.checkoutUpsell(applicationId, product.sku)

      if (result?.checkout_url) {
        // Hand off to the gateway. The add-on is only granted once the provider
        // confirms the charge, which arrives later as a webhook.
        window.location.assign(result.checkout_url)
        return
      }

      setError('The payment provider did not return a checkout link. Please try again.')
      setBusy(null)
    } catch (err) {
      // 422 `upsell_unavailable` is the server refusing for a reason the buyer
      // can act on — already bought, or withdrawn from the catalogue. Its
      // message is written for the buyer, so it is shown verbatim.
      setError(err?.message || 'Could not start the payment. Please try again.')
      setBusy(null)
    }
  }

  // The gateway returns here with `?upsell_return=1`. The webhook is
  // authoritative, so poll the catalogue briefly to pick up a notification that
  // has not landed yet rather than telling the buyer their purchase failed.
  //
  // `justReturned` is passed in rather than read from `window.location` here:
  // the page that owns this modal strips the parameter as soon as it has read
  // it, so by the time this effect runs the URL no longer carries the signal.
  useEffect(() => {
    if (!isOpen || !justReturned || !applicationId) return undefined

    let cancelled = false

    const check = async () => {
      try {
        const result = await seekerApi.upsells(applicationId)
        if (cancelled) return
        setCatalogue(result)
        if (result.some((item) => item.purchased)) {
          onPurchased?.(result)
        }
      } catch {
        // A failed poll is not a failed payment. Keep waiting quietly.
      }
    }

    check()
    pollRef.current = window.setInterval(check, 3000)

    return () => {
      cancelled = true
      window.clearInterval(pollRef.current)
    }
  }, [isOpen, applicationId, justReturned, onPurchased])

  useEffect(() => () => window.clearInterval(pollRef.current), [])

  const available = catalogue.filter((item) => !item.purchased)
  const owned = catalogue.filter((item) => item.purchased)

  const format = (amount, currency) => {
    try {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: currency || 'NGN',
        maximumFractionDigits: 0,
      }).format(amount / 100)
    } catch {
      return `${currency} ${(amount / 100).toFixed(2)}`
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      // While a checkout is being opened the modal must not be dismissable, or
      // the buyer can close it over a payment that is already in flight.
      onClose={busy ? undefined : onClose}
      title="Prepare for your new role"
      footer={
        <Button variant="outline" onClick={onClose} disabled={busy !== null}>
          {owned.length > 0 ? 'Done' : 'Not now'}
        </Button>
      }
    >
      <p className="text-secondary mb-4">
        You have accepted the offer for this role. If you would like help getting ready, these are the
        extras we offer.
      </p>

      {available.length === 0 && owned.length === 0 && !error ? (
        <p className="text-secondary mb-0">Nothing is available to add right now.</p>
      ) : null}

      {available.map((product) => (
        <div key={product.sku} className="border rounded-3 p-3 mb-3">
          <div className="d-flex justify-content-between align-items-baseline mb-2">
            <span className="fw-semibold">{product.name}</span>
            <span className="fw-bold text-dark">
              {format(product.amount, product.currency)}
            </span>
          </div>

          <p className="small text-secondary mb-2">{product.summary}</p>

          {Array.isArray(product.features) && product.features.length > 0 && (
            <ul className="hh-list-checks small mb-3">
              {product.features.map((feature) => (
                <li key={feature}>
                  <i className="bi bi-check-circle-fill" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
          )}

          <Button
            type="button"
            variant="primary"
            icon="bi-bag-check"
            block
            onClick={() => handleBuy(product)}
            disabled={busy !== null}
          >
            {busy === product.sku ? 'Opening checkout…' : `Buy for ${format(product.amount, product.currency)}`}
          </Button>
        </div>
      ))}

      {owned.map((product) => (
        <div key={product.sku} className="alert alert-success mb-0" role="status">
          <i className="bi bi-check-circle-fill me-2" aria-hidden="true" />
          <strong>{product.name}</strong> is booked. We will be in touch to arrange your session.
        </div>
      ))}

      {error && (
        <div className="alert alert-danger mb-0" role="alert">
          {error}
        </div>
      )}

      <p className="small text-secondary mt-3 mb-0">
        Payment is taken by our provider and your add-on is confirmed once they settle it. A receipt is
        emailed with the confirmation.
      </p>
    </Modal>
  )
}
