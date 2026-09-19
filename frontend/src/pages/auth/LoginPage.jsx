import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import Alert from '../../components/ui/Alert'
import { GoogleIcon, LinkedInIcon } from '../../components/common/SocialIcons'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setSubmitted(true)
  }

  return (
    <div className="hh-auth-card">
      <div className="text-center mb-4">
        <div className="hh-auth-eyebrow justify-content-center">
          <i className="bi bi-key" aria-hidden="true" />
          Welcome Back
        </div>
        <h1 className="hh-auth-title">Log in to HireHub</h1>
        <p className="hh-auth-subtitle">Log in to continue your HireHub journey.</p>
      </div>

      {submitted ? (
        <Alert variant="success" icon="check-circle" className="mb-4">
          You have been logged in (demo). In a live build this would authenticate your
          session and route you to your dashboard.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}
          <div className="hh-auth-fields">
            <FormInput
              label="Email address"
              id="login-email"
              type="email"
              icon="envelope"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <div>
              <label htmlFor="login-password" className="form-label">
                Password <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-lock text-muted" aria-hidden="true" />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Enter your password"
                  autoComplete="current-password"
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

            <div className="hh-auth-check-row">
              <label className="hh-auth-check">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="hh-auth-link small">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" block pill size="lg" icon="box-arrow-in-right">
              Log In
            </Button>
          </div>
        </form>
      )}

      {!submitted && (
        <>
          <div className="hh-auth-divider">or continue with</div>
          <div className="hh-auth-socials">
            <button type="button" className="hh-auth-social-btn">
              <GoogleIcon />
              Continue with Google
            </button>
            <button type="button" className="hh-auth-social-btn hh-auth-social-btn--linkedin">
              <LinkedInIcon />
              Continue with LinkedIn
            </button>
          </div>
        </>
      )}

      <div className="hh-auth-footer">
        Don&apos;t have an account?{' '}
        <Link to="/register/job-seeker" className="hh-auth-link">
          Create Account
        </Link>
      </div>
    </div>
  )
}