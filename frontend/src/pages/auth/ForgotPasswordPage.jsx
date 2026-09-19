import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import Alert from '../../components/ui/Alert'

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
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
          Enter the email linked to your account and we&apos;ll send you a link to reset
          your password.
        </p>
      </div>

      {submitted ? (
        <Alert variant="success" icon="envelope-check" className="mb-4">
          If an account exists for that email, a password reset link is on its way. Be
          sure to check your spam folder too.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <FormInput
            label="Email address"
            id="forgot-email"
            type="email"
            icon="envelope"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Button type="submit" block pill size="lg" icon="envelope-arrow-up">
            Send Reset Link
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