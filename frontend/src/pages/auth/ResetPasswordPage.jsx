import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import OtpInput from '../../components/ui/OtpInput'
import PasswordStrength from '../../components/ui/PasswordStrength'
import useOtpCountdown from '../../hooks/useOtpCountdown'
import { authApi, apiErrorMessage } from '../../services/api'
import { clearSession } from '../../services/api/client'

const MIN_LENGTH = 8

/**
 * Account recovery, in two steps on one screen.
 *
 * Step one redeems the emailed code for a single-use *grant*; step two spends
 * that grant setting the new password. Splitting it this way is deliberate: the
 * six digits are burned at the first step, so the endpoint that actually
 * changes a password cannot be attacked by guessing, and a code captured from a
 * screen or a mail archive is worth nothing a second time.
 *
 * Keeping both steps on one route avoids putting a credential in a URL, which
 * is where the old reset link leaked it into browser history and Referer headers.
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [step, setStep] = useState('code')
  const [code, setCode] = useState('')
  const [grant, setGrant] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const { seconds, canResend, start } = useOtpCountdown(
    Number(searchParams.get('cooldown')) || 0,
  )

  if (!email) {
    // No address means no honest way to ask which account is being recovered,
    // and guessing would leak whether it is registered.
    return (
      <div className="hh-auth-card">
        <div className="text-center mb-4">
          <div className="hh-auth-eyebrow justify-content-center">
            <i className="bi bi-shield-lock" aria-hidden="true" />
            Account Recovery
          </div>
          <h1 className="hh-auth-title">Start from your email address</h1>
          <p className="hh-auth-subtitle">
            Enter the address linked to your account and we&apos;ll send you a code.
          </p>
        </div>

        <Button to="/forgot-password" block pill size="lg" icon="envelope-arrow-up">
          Request a Code
        </Button>

        <div className="hh-auth-footer">
          <Link to="/login" className="hh-auth-link">
            Back to log in
          </Link>
        </div>
      </div>
    )
  }

  const handleVerifyCode = async (event) => {
    event.preventDefault()

    if (code.length !== 6) {
      setError('Enter the six digit code from your email.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const payload = await authApi.verifyOtp({ email, code, purpose: 'reset' })

      setGrant(payload.grant)
      setStep('password')
    } catch (err) {
      setError(apiErrorMessage(err, 'That code is not valid. Check it and try again.'))
      setCode('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')

    try {
      const payload = await authApi.resendOtp({ email, purpose: 'reset' })
      start(payload?.cooldown_seconds ?? 60)
    } catch (err) {
      if (err.status === 429) {
        start(err.retryAfter || 60)
        setError(apiErrorMessage(err, 'Please wait a moment before requesting another code.'))
      } else {
        setError(apiErrorMessage(err, 'We could not send a new code. Please try again.'))
      }
    } finally {
      setResending(false)
    }
  }

  const handleReset = async (event) => {
    event.preventDefault()
    setError('')

    if (password.length < MIN_LENGTH) {
      setError(`Your password must be at least ${MIN_LENGTH} characters long.`)
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match. Please try again.')
      return
    }

    setSubmitting(true)

    try {
      await authApi.resetPassword({ grant, email, password, passwordConfirmation: confirm })

      // Every token on the account was revoked server side, including any left
      // in this browser, so the local copy is dead too. Drop it now rather than
      // leaving a stale session that appears signed in until its next request.
      clearSession()
      setDone(true)
    } catch (err) {
      // 422 here means the grant expired or was already spent. It is single use
      // and time limited, so the only way forward is a fresh code.
      setError(apiErrorMessage(err, 'This reset has expired. Request a new code to continue.'))
      if (err.status === 422) {
        setGrant('')
        setStep('code')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="hh-auth-card">
        <div className="text-center mb-4">
          <div className="hh-auth-eyebrow justify-content-center">
            <i className="bi bi-check-circle" aria-hidden="true" />
            Password Updated
          </div>
          <h1 className="hh-auth-title">You&apos;re all set</h1>
          <p className="hh-auth-subtitle">
            Your password has been changed and every other signed-in device has been signed
            out, for your safety.
          </p>
        </div>

        <Button to="/login" block pill size="lg" icon="box-arrow-in-right">
          Sign In With Your New Password
        </Button>
      </div>
    )
  }

  return (
    <div className="hh-auth-card">
      <div className="text-center mb-4">
        <div className="hh-auth-eyebrow justify-content-center">
          <i className="bi bi-shield-lock" aria-hidden="true" />
          Account Recovery
        </div>
        <h1 className="hh-auth-title">
          {step === 'code' ? 'Enter your code' : 'Set a new password'}
        </h1>
        <p className="hh-auth-subtitle">
          {step === 'code' ? (
            <>
              We sent a six digit code to <strong>{email}</strong>. Enter it to continue.
            </>
          ) : (
            'Choose a strong password you haven’t used on HireHub before.'
          )}
        </p>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {step === 'code' ? (
        <form onSubmit={handleVerifyCode} noValidate>
          <OtpInput
            value={code}
            onChange={(next) => {
              setCode(next)
              if (error) setError('')
            }}
            disabled={submitting}
            autoFocus
            hasError={Boolean(error)}
          />

          <Button type="submit" block pill size="lg" disabled={submitting || code.length !== 6}>
            {submitting ? 'Checking…' : 'Continue'}
          </Button>

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
        </form>
      ) : (
        <form onSubmit={handleReset} noValidate>
          <div className="mb-3">
            <label htmlFor="reset-password" className="form-label">
              New password <span className="text-danger">*</span>
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="bi bi-lock text-muted" aria-hidden="true" />
              </span>
              <input
                id="reset-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Enter new password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="hh-password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          <PasswordStrength value={password} />

          <div className="mb-4">
            <label htmlFor="reset-confirm" className="form-label">
              Confirm new password <span className="text-danger">*</span>
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="bi bi-lock-fill text-muted" aria-hidden="true" />
              </span>
              <input
                id="reset-confirm"
                name="confirm"
                type={showConfirm ? 'text' : 'password'}
                className="form-control"
                placeholder="Re-enter new password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <button
                type="button"
                className="hh-password-toggle"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirm((prev) => !prev)}
              >
                <i className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          <Button type="submit" block pill size="lg" icon="check2-circle" disabled={submitting}>
            {submitting ? 'Updating…' : 'Reset Password'}
          </Button>

          <div className="hh-auth-footer">
            <button
              type="button"
              className="hh-auth-link small btn btn-link p-0"
              onClick={() => {
                setStep('code')
                setGrant('')
                setError('')
              }}
            >
              Use a different code
            </button>
          </div>
        </form>
      )}

      <div className="hh-auth-footer">
        <Link to="/login" className="hh-auth-link">
          Back to log in
        </Link>
      </div>
    </div>
  )
}
