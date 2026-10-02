import { useCallback, useState } from 'react'

/**
 * View/Download controls for a transaction receipt.
 *
 * Both actions go through the API rather than an <a href>, because the receipt
 * endpoints are bearer-token protected: a plain link in a new tab arrives with
 * no Authorization header and shows the customer a 401 instead of their
 * receipt.
 *
 * Paid rows get both actions; anything not settled gets a dash, because there
 * is no document to show and an enabled button that 409s on click is worse than
 * an obviously absent one.
 */
export default function ReceiptActions({ onView, onDownload, reference, paid }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  const run = useCallback(
    async (action, handler) => {
      setBusy(action)
      setError('')

      try {
        await handler()
      } catch (err) {
        setError(
          err?.message === 'Your browser blocked the new tab. Allow pop-ups to view receipts.'
            ? err.message
            : 'Could not load the receipt. Please try again.'
        )
      } finally {
        setBusy(null)
      }
    },
    [],
  )

  if (!paid) {
    return <span className="text-muted">—</span>
  }

  return (
    <div className="d-flex flex-column align-items-end gap-1">
      <div className="d-flex align-items-center gap-2 justify-content-end">
        <button
          type="button"
          className="btn btn-link btn-sm p-0 hh-table-link"
          onClick={() => run('view', () => onView(reference))}
          disabled={busy !== null}
          aria-label={`View receipt for ${reference}`}
        >
          {busy === 'view' ? (
            <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          ) : (
            <>
              <i className="bi bi-eye" aria-hidden="true" />
              <span className="visually-hidden">View receipt for </span>
              <span aria-hidden="true">View</span>
            </>
          )}
        </button>

        <button
          type="button"
          className="btn btn-link btn-sm p-0 hh-table-link"
          onClick={() => run('download', () => onDownload(reference))}
          disabled={busy !== null}
          aria-label={`Download receipt for ${reference}`}
        >
          {busy === 'download' ? (
            <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          ) : (
            <>
              <i className="bi bi-download" aria-hidden="true" />
              <span className="visually-hidden">Download receipt for </span>
              <span aria-hidden="true">PDF</span>
            </>
          )}
        </button>
      </div>

      {error ? (
        <span className="small text-danger text-end" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}