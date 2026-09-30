import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import OtpInput from '../../components/ui/OtpInput'
import useOtpCountdown from '../../hooks/useOtpCountdown'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../services/api'

/**
 * Confirming a signup with the six digit code that was emailed.
 *
 * The code is entered here rather than followed from a link, which means the
 * address is proven by possession of something only the inbox holder has, with
 * no URL to leak through a shared screen, a browser history or a Referer
 * header. It expires in minutes, is good once, and is burned after a handful of
 * wrong guesses.
 *
 * The resend timer is driven by the cooldown the API reports rather than a
 * locally invented delay, so the button never offers something the server will
 * refuse.
 */
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setSession } = useAuth()

  const email = searchParams.get('email') ?? ''
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const { seconds, canResend, start } = useOtpCountdown(
    Number(searchParams.get('cooldown')) || 0,
  )

  if (!email) {
    // Without an address there is nothing to verify, and no honest way to ask
    // which one: guessing would leak whether it is registered.
    return (
      <div className="hh-auth-card">
        <div className="text-center mb-4">
          <h1 className="hh-auth-title">Nothing to verify</h1>
          <p className="hh-auth-subtitle">
            Open this page from the sign-up flow, or request a new code from the sign-in page.
          </p>
        </div>
        <Button to="/login" block pill size="lg" icon="box-arrow-in-right">
          Back to Log In
        </Button>
      </div>
    )
  }

  const handleVerify = async (event) => {
    event.preventDefault()
    if (code.length !== 6) {
      setError('Enter the six digit code from your email.')
      return
    }

    setVerifying(true)
    setError('')
    setNotice('')

    try {
      const payload = await authApi.verifyOtp({ email, code, purpose: 'verify' })

      // A token is only issued once the address is proven, so the user can go
      // straight to their dashboard instead of logging in a second time.
      setSession(payload)
      const target =
        payload.user?.role === 'employer'
          ? '/employer'
          : payload.user?.role === 'admin'
            ? '/admin'
            : '/seeker'
      navigate(target, { replace: true })
    } catch (err) {
      setError(
        err.payload?.message ||
          'That code is not valid. Check it and try again.',
      )
      setCode('')
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    setNotice('')

    try {
      const payload = await authApi.resendOtp({ email, purpose: 'verify' })

      // The endpoint is unauthenticated and answers identically for an address
      // with no account, so this must not be read as confirmation either way.
      start(payload?.cooldown_seconds ?? 60)
      setNotice('If that address is registered, a new code is on its way.')
    } catch (err) {
      if (err.status === 429) {
        // The server refused inside the cooldown. Believe its own Retry-After
        // and restart the countdown rather than leaving the button dead.
        start(err.retryAfter || 60)
        setError(err.payload?.message || 'Please wait a moment before requesting another code.')
      } else {
        setError('We could not send a new code. Please try again.')
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="hh-auth-card">
      <div className="text-center mb-4">
        <div className="hh-auth-eyebrow justify-content-center">
          <i className="bi bi-shield-check" aria-hidden="true" />
          Verify Your Email
        </div>
        <h1 className="hh-auth-title">Enter your code</h1>
        <p className="hh-auth-subtitle">
          We sent a six digit code to <strong>{email}</strong>. Enter it below to finish creating
          your account.
        </p>
      </div>

      {notice && (
        <Alert variant="info" icon="envelope-check" className="mb-4">
          {notice}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleVerify} noValidate>
        <OtpInput
          value={code}
          onChange={(next) => {
            setCode(next)
            if (error) setError('')
          }}
          disabled={verifying}
          autoFocus
          hasError={Boolean(error)}
        />

        <Button type="submit" block pill size="lg" disabled={verifying || code.length !== 6}>
          {verifying ? 'Verifying…' : 'Verify Email Address'}
        </Button>
      </form>

      <div className="hh-otp-resend">
        {canResend ? (
          <button
            type="button"
            className="btn btn-link p-0 hh-auth-link"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? 'Sending…' : 'Did not get a code? Send another'}
          </button>
        ) : (
          <span aria-live="polite">
            You can request another code in {seconds} second{seconds === 1 ? '' : 's'}.
          </span>
        )}
      </div>

      <div className="hh-auth-footer">
        <Link to="/login" className="hh-auth-link small">
          Back to log in
        </Link>
      </div>
    </div>
  )
}
