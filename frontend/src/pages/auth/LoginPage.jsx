import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import Alert from '../../components/ui/Alert'
import { GoogleIcon, LinkedInIcon } from '../../components/common/SocialIcons'
import { useAuth } from '../../context/AuthContext'

const apiErrorMessage = (err) => {
  const errors = err?.payload?.errors
  if (Array.isArray(errors) && errors.length) return errors[0]
  if (errors && typeof errors === 'object') {
    const key = Object.keys(errors)[0]
    if (key) {
      const value = errors[key]
      return Array.isArray(value) ? value[0] : value
    }
  }
  return err?.payload?.message || 'Something went wrong. Please try again.'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      if (user?.role === 'employer') navigate('/employer')
      else if (user?.role === 'admin') navigate('/admin')
      else navigate('/seeker')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <Button
            type="submit"
            block
            pill
            size="lg"
            icon={loading ? 'arrow-repeat' : 'box-arrow-in-right'}
            disabled={loading}
          >
            Log In
          </Button>
        </div>
      </form>

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

      <div className="hh-auth-footer">
        Don&apos;t have an account?{' '}
        <Link to="/register/job-seeker" className="hh-auth-link">
          Create Account
        </Link>
      </div>
    </div>
  )
}
