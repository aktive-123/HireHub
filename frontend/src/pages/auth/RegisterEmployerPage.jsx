import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import FormSelect from '../../components/ui/FormSelect'
import Alert from '../../components/ui/Alert'
import PasswordStrength from '../../components/ui/PasswordStrength'
import ValidationChecklist from '../../components/ui/ValidationChecklist'
import { GoogleIcon, LinkedInIcon } from '../../components/common/SocialIcons'

const ROLE_LINKS = [
  { key: 'seeker', to: '/register/job-seeker', label: 'Job Seeker' },
  { key: 'employer', to: '/register/employer', label: 'Employer' },
]

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1,000', '1,000+']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function RegisterEmployerPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')

  const CURRENT_ROLE = 'employer'
  const emailValid = EMAIL_RE.test(email.trim())
  const termsError = Boolean(error) && !agreed

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!agreed) {
      setError('Please accept the Terms of Service and Privacy Policy to continue.')
      return
    }

    setSubmitted(true)
  }

  return (
    <div className="hh-auth-card">
      <div className="hh-role-switch mb-4" role="tablist" aria-label="Account type">
        {ROLE_LINKS.map((role) => (
          <Link
            key={role.key}
            to={role.to}
            role="tab"
            aria-selected={role.key === CURRENT_ROLE}
            className={`hh-role-tab ${role.key === CURRENT_ROLE ? 'is-active' : ''}`}
          >
            {role.label}
          </Link>
        ))}
      </div>

      <div className="text-center mb-4">
        <div className="hh-auth-eyebrow justify-content-center">
          <i className="bi bi-briefcase" aria-hidden="true" />
          Join HireHub
        </div>
        <h1 className="hh-auth-title">Create your employer account</h1>
        <p className="hh-auth-subtitle">
          Find talented professionals and build your team on HireHub.
        </p>
      </div>

      {submitted ? (
        <Alert variant="success" icon="check-circle" className="mb-4">
          Your employer account has been created (demo). In a live build you would
          verify your company details before posting jobs.
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
              label="Full name"
              id="em-name"
              icon="person"
              placeholder="David Okonkwo"
              autoComplete="name"
              required
            />
            <FormInput
              label="Company name"
              id="em-company"
              icon="building"
              placeholder="Acme Corporation"
              autoComplete="organization"
              required
            />

            <div className="hh-auth-field-group">
              <FormInput
                label="Work email"
                id="em-email"
                type="email"
                icon="envelope"
                placeholder="you@company.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {email && (
                <ValidationChecklist
                  ariaLabel="Email requirements"
                  items={[{ ok: emailValid, label: 'Enter a valid email address' }]}
                />
              )}
            </div>

            <div className="hh-auth-names">
              <FormSelect
                label="Company size"
                id="em-size"
                options={COMPANY_SIZES}
                placeholder="Select company size"
                required
              />
              <div className="hh-auth-field-group hh-auth-password">
                <label htmlFor="em-password" className="form-label">
                  Password <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-white">
                    <i className="bi bi-lock text-muted" aria-hidden="true" />
                  </span>
                  <input
                    id="em-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    minLength={8}
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
                <PasswordStrength value={password} />
              </div>
            </div>

            <label className={`hh-auth-check ${termsError ? 'is-invalid' : ''}`}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked)
                  if (e.target.checked) setError('')
                }}
                required
                aria-required="true"
              />
              <span>
                I agree to the HireHub{' '}
                <Link to="/contact" className="hh-auth-link">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/contact" className="hh-auth-link">
                  Privacy Policy
                </Link>{' '}
                <span className="text-danger">*</span>.
              </span>
            </label>

            <Button type="submit" block pill size="lg" icon="building">
              Create Employer Account
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
        Already have an account?{' '}
        <Link to="/login" className="hh-auth-link">
          Log in
        </Link>
      </div>
    </div>
  )
}