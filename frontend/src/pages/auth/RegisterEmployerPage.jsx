import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import FormSelect from '../../components/ui/FormSelect'
import Alert from '../../components/ui/Alert'
import PasswordStrength from '../../components/ui/PasswordStrength'
import ValidationChecklist from '../../components/ui/ValidationChecklist'
import { GoogleIcon, LinkedInIcon } from '../../components/common/SocialIcons'
import { authApi, apiErrorMessage, apiFieldErrors } from '../../services/api'
import {
  DIAL_CODE,
  NIGERIAN_STATES,
  PHONE_PLACEHOLDER,
  hasValue,
  phoneError,
} from '../../constants/nigeria'

const ROLE_LINKS = [
  { key: 'seeker', to: '/register/job-seeker', label: 'Job Seeker' },
  { key: 'employer', to: '/register/employer', label: 'Employer' },
]

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1,000', '1,000+']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function RegisterEmployerPage() {
  const navigate = useNavigate()
  // Registration no longer establishes a session: the account stays pending until the
  // emailed code is entered, so the verify screen signs the user in afterwards.
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [loading, setLoading] = useState(false)

  const CURRENT_ROLE = 'employer'
  const emailValid = EMAIL_RE.test(email.trim())
  const phoneValid = phoneError(phone) === null
  const termsError = Boolean(error) && !agreed

  const validate = () => {
    const next = {}
    const phoneProblem = phoneError(phone)

    if (phoneProblem) next.phone = phoneProblem
    if (!hasValue(street)) {
      next.address_line = 'Please enter your company street address.'
    } else if (street.trim().length < 5) {
      next.address_line = 'Please enter a longer company street address.'
    }
    if (!hasValue(city)) next.city = 'Please enter your company city.'
    if (!hasValue(state)) next.state = 'Please select your company state.'

    return next
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!agreed) {
      setError('Please accept the Terms of Service and Privacy Policy to continue.')
      return
    }

    const nextErrors = validate()
    setErrors(nextErrors)

    if (Object.values(nextErrors).some(Boolean)) {
      setError('Please correct the highlighted fields and try again.')
      return
    }

    setLoading(true)
    try {
      const payload = await authApi.register({
        role: 'employer',
        full_name: fullName,
        company_name: companyName,
        work_email: email,
        company_size: companySize || null,
        phone,
        address_line: street,
        city,
        state,
        password,
        password_confirmation: password,
      })

      // No token comes back: the account is created pending until the emailed
      // code is entered, so there is nothing to sign in with yet.
      navigate(
        `/verify-email?email=${encodeURIComponent(payload.email ?? email)}&cooldown=${
          payload.resend_cooldown_seconds ?? 60
        }`,
        { replace: true },
      )
    } catch (err) {
      setError(apiErrorMessage(err))
      setErrors(apiFieldErrors(err))
    } finally {
      setLoading(false)
    }
  }

  /** Clears a field's error as soon as the user starts fixing it. */
  const clearError = (field) => () =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))

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
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <FormInput
            label="Company name"
            id="em-company"
            icon="building"
            placeholder="Acme Corporation"
            autoComplete="organization"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
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

          <div className="hh-auth-field-group">
            <FormInput
              label="Company phone number"
              id="em-phone"
              type="tel"
              icon="telephone"
              placeholder={PHONE_PLACEHOLDER}
              autoComplete="tel-national"
              helperText={`Nigerian number, starting with ${DIAL_CODE}`}
              error={errors.phone}
              required
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                clearError('phone')()
              }}
            />
            {phone && (
              <ValidationChecklist
                ariaLabel="Phone number requirements"
                items={[{ ok: phoneValid, label: 'Enter a valid Nigerian phone number' }]}
              />
            )}
          </div>

          <FormInput
            label="Company street address"
            id="em-street"
            icon="geo-alt"
            placeholder="12 Admiralty Way, Lekki Phase 1"
            autoComplete="street-address"
            error={errors.address_line}
            required
            value={street}
            onChange={(e) => {
              setStreet(e.target.value)
              clearError('address_line')()
            }}
          />

          <div className="hh-auth-names">
            <FormInput
              label="Company city"
              id="em-city"
              placeholder="Lagos"
              autoComplete="address-level2"
              error={errors.city}
              required
              value={city}
              onChange={(e) => {
                setCity(e.target.value)
                clearError('city')()
              }}
            />
            <FormSelect
              label="Company state"
              id="em-state"
              options={NIGERIAN_STATES}
              placeholder="Select state"
              error={errors.state}
              required
              value={state}
              onChange={(e) => {
                setState(e.target.value)
                clearError('state')()
              }}
            />
          </div>

          <div className="hh-auth-names">
            <FormSelect
              label="Company size"
              id="em-size"
              options={COMPANY_SIZES}
              placeholder="Select company size"
              required
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
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

          <Button
            type="submit"
            block
            pill
            size="lg"
            icon={loading ? 'arrow-repeat' : 'building'}
            disabled={loading}
          >
            Create Employer Account
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
        Already have an account?{' '}
        <Link to="/login" className="hh-auth-link">
          Log in
        </Link>
      </div>
    </div>
  )
}
