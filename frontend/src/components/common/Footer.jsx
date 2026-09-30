import { useState } from 'react'
import { Link } from 'react-router-dom'
import { publicApi } from '../../services/api'
import logoImg from '../../assets/white logo.png'

// Real destinations. These were href="#linkedin" and friends, which jumped the
// page to the top and went nowhere.
const SOCIALS = [
  { key: 'linkedin', label: 'LinkedIn', icon: 'linkedin', href: 'https://www.linkedin.com/company/hirehub' },
  { key: 'x', label: 'X / Twitter', icon: 'twitter-x', href: 'https://x.com/hirehub' },
  { key: 'facebook', label: 'Facebook', icon: 'facebook', href: 'https://www.facebook.com/hirehub' },
  { key: 'instagram', label: 'Instagram', icon: 'instagram', href: 'https://www.instagram.com/hirehub' },
  { key: 'youtube', label: 'YouTube', icon: 'youtube', href: 'https://www.youtube.com/@hirehub' },
]

export default function Footer() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | submitting | done | error
  const [message, setMessage] = useState('')

  const handleSubmitNewsletter = async (e) => {
    e.preventDefault()
    if (state === 'submitting') return

    setState('submitting')
    setMessage('')

    try {
      const res = await publicApi.subscribeToNewsletter(email, 'footer')
      setMessage(res?.message || 'Check your inbox to confirm your subscription.')
      setState('done')
      // Clearing the field signals the submission was accepted; the message
      // below carries the "confirm your email" instruction.
      setEmail('')
    } catch (err) {
      const field = err?.payload?.errors?.email?.[0]
      setMessage(field || err?.message || 'We could not sign you up just now. Please try again.')
      setState('error')
    }
  }

  return (
    <footer className="hh-footer">
      <div className="page-container">
        <div className="row g-4">
          <div className="col-12 col-md-4 col-lg-3">
            <Link to="/" className="d-inline-block mb-3">
              <img
                src={logoImg}
                alt="HireHub Logo"
                className="hh-navbar-brand-logo"
              />
            </Link>
            <p className="hh-text-muted fs-6 mb-4">
              Connecting talent with opportunity.
            </p>
            <div className="hh-footer-socials">
              {SOCIALS.map((social) => (
                <a
                  key={social.key}
                  href={social.href}
                  className="hh-footer-social-btn"
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className={`bi bi-${social.icon}`} />
                </a>
              ))}
            </div>
          </div>

          <div className="col-6 col-md-4 col-lg-2">
            <h3 className="hh-footer-title">For Job Seekers</h3>
            <ul className="hh-footer-links">
              <li><Link to="/jobs" className="hh-footer-link">Browse Jobs</Link></li>
              <li><Link to="/register/job-seeker" className="hh-footer-link">Create Profile</Link></li>
              <li><Link to="/seeker/saved-jobs" className="hh-footer-link">Saved Jobs</Link></li>
              <li><Link to="/resources" className="hh-footer-link">Career Resources</Link></li>
            </ul>
          </div>

          <div className="col-6 col-md-4 col-lg-2">
            <h3 className="hh-footer-title">For Employers</h3>
            <ul className="hh-footer-links">
              <li><Link to="/employer/jobs/create" className="hh-footer-link">Post a Job</Link></li>
              <li><Link to="/employer/applicants" className="hh-footer-link">Find Talent</Link></li>
              <li><Link to="/about" className="hh-footer-link">Pricing</Link></li>
              <li><Link to="/companies" className="hh-footer-link">Company Profiles</Link></li>
            </ul>
          </div>

          <div className="col-6 col-md-4 col-lg-2">
            <h3 className="hh-footer-title">Company</h3>
            <ul className="hh-footer-links">
              <li><Link to="/about" className="hh-footer-link">About Us</Link></li>
              <li><Link to="/contact" className="hh-footer-link">Contact</Link></li>
              <li><Link to="/faq" className="hh-footer-link">FAQ</Link></li>
              <li><Link to="/about" className="hh-footer-link">Privacy Policy</Link></li>
              <li><Link to="/about" className="hh-footer-link">Terms of Service</Link></li>
            </ul>
          </div>

          <div className="col-12 col-md-8 col-lg-3">
            <h3 className="hh-footer-title">Subscribe to our Newsletter</h3>
            <p className="hh-text-muted fs-6 mb-3">
              Get the latest jobs and career tips.
            </p>
            <form onSubmit={handleSubmitNewsletter} noValidate>
              <div className="input-group">
                <label htmlFor="newsletter-email" className="visually-hidden">
                  Email address for newsletter
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  className="form-control"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    // Clear a previous verdict as soon as they retype, so the
                    // old error does not sit under a corrected address.
                    if (state === 'error' || state === 'done') {
                      setState('idle')
                      setMessage('')
                    }
                  }}
                  disabled={state === 'submitting'}
                  aria-label="Email address for newsletter"
                  aria-describedby={message ? 'newsletter-status' : undefined}
                  aria-invalid={state === 'error' || undefined}
                  required
                />
                <button
                  type="submit"
                  className="hh-btn hh-btn-primary"
                  aria-label="Subscribe to newsletter"
                  disabled={state === 'submitting'}
                >
                  {state === 'submitting' ? (
                    <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                  ) : (
                    <i className="bi bi-arrow-right" />
                  )}
                </button>
              </div>
            </form>

            {/*
              role="status" so the outcome is announced to a screen reader.
              Without it the form appears to do nothing at all, which is exactly
              the bug this replaced.
            */}
            <p
              id="newsletter-status"
              role="status"
              aria-live="polite"
              className={`small mt-2 mb-0 ${
                state === 'error' ? 'text-danger' : state === 'done' ? 'text-success' : ''
              }`}
            >
              {message || (state === 'done' ? 'Almost there — check your inbox to confirm.' : '')}
            </p>
          </div>
        </div>

        <div className="hh-footer-bottom">
          <div>© 2026 HireHub. All rights reserved.</div>
          <div>Built with ❤️ for a better tomorrow.</div>
        </div>
      </div>
    </footer>
  )
}
