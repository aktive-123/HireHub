import { useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../../components/ui/Reveal'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import FormSelect from '../../components/ui/FormSelect'
import HeroSection from '../../components/ui/HeroSection'
import heroSlide1 from '../../assets/contact.jpg'
import heroSlide2 from '../../assets/contact3.jpg'
import heroSlide3 from '../../assets/contact4.jpg'

const heroSlides = [heroSlide1, heroSlide2, heroSlide3]

const SUPPORT_OPTIONS = [
  {
    icon: 'person-badge',
    title: 'Job seeker support',
    text: 'Need help with your profile, applications, or tracking your job search? Our team is here to help you move forward.',
    cta: { label: 'Get Job Seeker Support', to: '/contact', icon: 'headset' },
  },
  {
    icon: 'briefcase',
    title: 'Employer support',
    text: 'Need help posting jobs, screening candidates, or finding the right talent? We make hiring on HireHub effortless.',
    cta: { label: 'Get Employer Support', to: '/contact', icon: 'headset' },
  },
]

const SUBJECTS = [
  'General inquiry',
  'Job postings & hiring',
  'Candidate support',
  'Account & billing',
  'Report a problem',
]

const CONTACT_META = [
  { icon: 'envelope', label: 'Email us', value: 'support@hirehub.com' },
  { icon: 'telephone', label: 'Call us', value: '+234 (0) 700 443 482' },
  { icon: 'geo-alt', label: 'Visit us', value: '12 Admiralty Way, Lekki Phase 1, Lagos, Nigeria' },
  { icon: 'clock', label: 'Support hours', value: 'Mon – Fri, 8:00am – 6:00pm WAT' },
]

const QUICK_LINKS = [
  { label: 'Browse open jobs', to: '/jobs', icon: 'briefcase' },
  { label: 'Explore companies', to: '/companies', icon: 'building' },
  { label: 'Post a job', to: '/employer/jobs/create', icon: 'file-earmark-plus' },
]

const SOCIALS = [
  { icon: 'linkedin', label: 'LinkedIn' },
  { icon: 'twitter-x', label: 'X / Twitter' },
  { icon: 'facebook', label: 'Facebook' },
  { icon: 'instagram', label: 'Instagram' },
  { icon: 'youtube', label: 'YouTube' },
]

const INITIAL_VALUES = { name: '', email: '', subject: '', message: '' }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ContactPage() {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorSummary, setErrorSummary] = useState('')

  const handleChange = (key) => (e) => {
    const next = { ...values, [key]: e.target.value }
    setValues(next)
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setErrorSummary('')
  }

  const validate = () => {
    const next = {}
    if (!values.name.trim()) next.name = 'Please enter your name.'
    if (!values.email.trim()) {
      next.email = 'Please enter your email address.'
    } else if (!EMAIL_RE.test(values.email.trim())) {
      next.email = 'Please enter a valid email address.'
    }
    if (!values.subject) next.subject = 'Please select a subject.'
    if (!values.message.trim()) {
      next.message = 'Please enter your message.'
    } else if (values.message.trim().length < 10) {
      next.message = 'Your message should be at least 10 characters.'
    }
    return next
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)

    if (Object.values(nextErrors).some(Boolean)) {
      setErrorSummary('Please correct the highlighted fields and try again.')
      return
    }

    setSending(true)
    setErrorSummary('')
    setTimeout(() => {
      setSending(false)
      setSubmitted(true)
      setValues(INITIAL_VALUES)
    }, 1000)
  }

  const submitLabel = sending ? (
    <>
      <span className="hh-spinner hh-spinner-sm me-2" aria-hidden="true" />
      Sending…
    </>
  ) : (
    'Send Message'
  )

  return (
    <>
      <HeroSection
        images={heroSlides}
        eyebrow="CONTACT US"
        title="How Can We Help?"
        subtitle="Have a question about HireHub? Our team is here to help — for both job seekers and employers."
      />

      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <div className="hh-contact-grid hh-mb-5">
              {SUPPORT_OPTIONS.map((option) => (
                <div className="hh-contact-option" key={option.title}>
                  <div className="hh-contact-option-icon" aria-hidden="true">
                    <i className={`bi bi-${option.icon}`} />
                  </div>
                  <h3>{option.title}</h3>
                  <p>{option.text}</p>
                  <Button
                    to={option.cta.to}
                    variant="outline"
                    pill
                    size="sm"
                    icon={option.cta.icon}
                    className="align-self-start"
                  >
                    {option.cta.label}
                  </Button>
                </div>
              ))}
            </div>
          </Reveal>

          <div className="hh-detail-grid hh-contact-detail">
            <Reveal>
              <div className="hh-detail-card">
                <h2>Send us a message</h2>

                {submitted && (
                  <Alert
                    variant="success"
                    className="hh-mb-4"
                    dismissible
                    onDismiss={() => setSubmitted(false)}
                  >
                    Thanks for reaching out! A member of the HireHub team will get back to you
                    within one business day.
                  </Alert>
                )}

                {errorSummary && (
                  <Alert
                    variant="danger"
                    className="hh-mb-4"
                    dismissible
                    onDismiss={() => setErrorSummary('')}
                  >
                    {errorSummary}
                  </Alert>
                )}

                <form onSubmit={handleSubmit} noValidate className="hh-contact-form" aria-label="Contact form">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FormInput
                        label="Full name"
                        id="contact-name"
                        placeholder="Your name"
                        required
                        value={values.name}
                        onChange={handleChange('name')}
                        error={errors.name}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <FormInput
                        label="Email address"
                        id="contact-email"
                        type="email"
                        placeholder="you@example.com"
                        required
                        value={values.email}
                        onChange={handleChange('email')}
                        error={errors.email}
                      />
                    </div>
                    <div className="col-12">
                      <FormSelect
                        label="Subject"
                        id="contact-subject"
                        options={SUBJECTS}
                        placeholder="Select a subject"
                        required
                        value={values.subject}
                        onChange={handleChange('subject')}
                        error={errors.subject}
                      />
                    </div>
                    <div className="col-12">
                      <label htmlFor="contact-message" className="form-label">
                        Message <span className="text-danger">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        className={`form-control ${errors.message ? 'is-invalid' : ''}`}
                        rows="5"
                        placeholder="How can we help?"
                        required
                        value={values.message}
                        onChange={handleChange('message')}
                        aria-invalid={Boolean(errors.message)}
                      />
                      {errors.message && (
                        <div className="invalid-feedback">{errors.message}</div>
                      )}
                    </div>
                    <div className="col-12">
                      <Button
                        type="submit"
                        pill
                        size="lg"
                        icon={sending ? undefined : 'send'}
                        disabled={sending}
                      >
                        {submitLabel}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </Reveal>

            <Reveal>
              <div className="hh-sidebar-card hh-company-info-card hh-contact-info-card">
                <h3>Contact information</h3>
                <div className="hh-contact-meta-list">
                  {CONTACT_META.map((item) => (
                    <div className="hh-contact-meta-item" key={item.label}>
                      <i className={`bi bi-${item.icon}`} aria-hidden="true" />
                      <span>
                        <strong>{item.label}</strong>
                        <span>{item.value}</span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="hh-contact-info-footer">
                  <div className="hh-contact-response">
                    <i className="bi bi-clock-history" aria-hidden="true" />
                    <span>
                      <strong>Average response time</strong>
                      <span>Within one business day</span>
                    </span>
                  </div>

                  <div className="hh-contact-quick-row">
                    {QUICK_LINKS.map((link) => (
                      <Link to={link.to} className="hh-contact-quick-link" key={link.label}>
                        <i className={`bi bi-${link.icon}`} aria-hidden="true" />
                        {link.label}
                      </Link>
                    ))}
                  </div>

                  <div className="hh-contact-socials">
                    <span className="hh-contact-socials-label">Follow HireHub</span>
                    <div className="hh-contact-socials-btns">
                      {SOCIALS.map((social) => (
                        <a
                          href={`#${social.icon}`}
                          className="hh-contact-social-btn"
                          aria-label={social.label}
                          key={social.icon}
                        >
                          <i className={`bi bi-${social.icon}`} />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}