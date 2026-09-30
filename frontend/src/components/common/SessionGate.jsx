/**
 * Full-page placeholder shown while the stored session is still being verified.
 *
 * AuthProvider starts with `bootstrapped === false` and only knows whether the
 * saved token is good once GET /auth/me resolves. Rendering protected page
 * content before then let each page mount and immediately fire its API calls
 * against an unverified session, so on a slow API the user watched the real
 * dashboard flash an error panel ("Couldn't load your dashboard") before the
 * redirect to /login finally happened. Holding the content back until the
 * session is known removes that race entirely.
 */
export default function SessionGate() {
  return (
    <div className="hh-section-space" style={{ minHeight: '60vh' }} aria-busy="true">
      <div className="page-container">
        <div
          className="d-flex flex-column align-items-center justify-content-center text-center"
          style={{ minHeight: '45vh' }}
        >
          <span className="spinner-border text-primary" aria-hidden="true" />
          {/* Announced to screen readers so the wait is not silent. */}
          <p className="hh-text-muted mt-3 mb-0" role="status">
            Checking your session…
          </p>
        </div>
      </div>
    </div>
  )
}
