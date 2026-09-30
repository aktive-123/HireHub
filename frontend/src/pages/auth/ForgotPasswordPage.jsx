import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import Alert from '../../components/ui/Alert'
import { authApi, apiErrorMessage } from '../../services/api'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Enter the email address linked to your account.')
      return
    }

    const address = email.trim()
    setSubmitting(true)

    try {
      await authApi.forgotPassword(address)
      setSubmitted(true)
    } catch (err) {
      // A 429 here means the per-address limit was reached, which is the only
      // case worth surfacing — the API deliberately gives the same answer for
      // an unknown address so accounts cannot be enumerated here.
      if (err.status === 429) {
        setError('Too many reset requests. Wait a moment and try again.')
      } else {
        setError(apiErrorMessage(err, 'We could not send a reset code. Please try again.'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="hh-auth-card">
      <div className="text-center mb-4">
        <div className="hh-auth-eyebrow justify-content-center">
          <i className="bi bi-shield-lock" aria-hidden="true" />
          Account Recovery
        </div>
        <h1 className="hh-auth-title">Forgot your password?</h1>
        <p className="hh-auth-subtitle">
          Enter the email linked to your account and we&apos;ll send you a code to reset your
          password.
        </p>
      </div>

      {submitted ? (
        <>
          <Alert variant="success" icon="envelope-check" className="mb-4">
            If an account exists for that email, a reset code is on its way. It expires in
            minutes, so enter it while it is fresh.
          </Alert>

          <Button
            type="button"
            block
            pill
            size="lg"
            icon="key"
            // The address goes in the query string so a refresh does not lose
            // the context of which account is being recovered. It is the user's
            // own address, not a credential.
            onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`)}
          >
            Enter My Code
          </Button>
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <FormInput
            label="Email address"
            id="forgot-email"
            type="email"
            icon="envelope"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button type="submit" block pill size="lg" icon="envelope-arrow-up" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send Reset Code'}
          </Button>
        </form>
      )}

      <div className="hh-auth-footer">
        Remembered it after all?{' '}
        <Link to="/login" className="hh-auth-link">
          Back to log in
        </Link>
      </div>
    </div>
  )
}
