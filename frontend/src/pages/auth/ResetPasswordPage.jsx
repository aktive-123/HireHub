import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Alert from '../../components/ui/Alert'

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const form = e.currentTarget
    const password = form.password.value
    const confirm = form.confirm.value

    if (password.length < 6) {
      setError('Your password must be at least 6 characters long.')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match. Please try again.')
      return
    }

    setSubmitted(true)
  }

  return (
    <div className="hh-auth-card">
      <div className="text-center mb-4">
        <div className="hh-auth-eyebrow justify-content-center">
          <i className="bi bi-key" aria-hidden="true" />
          Account Recovery
        </div>
        <h1 className="hh-auth-title">Set a new password</h1>
        <p className="hh-auth-subtitle">
          Choose a strong password you haven&apos;t used on HireHub before.
        </p>
      </div>

      {submitted ? (
        <Alert variant="success" icon="check-circle" className="mb-4">
          Your password has been reset successfully. Log in with your new password to
          continue.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

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

          <Button type="submit" block pill size="lg" icon="check2-circle">
            Reset Password
          </Button>
        </form>
      )}

      {submitted && (
        <Link to="/login" className="hh-auth-link d-block text-center mt-4">
          Back to log in
        </Link>
      )}
    </div>
  )
}