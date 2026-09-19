import { Link } from 'react-router-dom'
import useInView from '../../hooks/useInView'

export default function FinalCtaSection({
  eyebrow = 'READY TO TAKE THE NEXT STEP?',
  title = 'Your Future Starts Here',
  subtitle = 'Join thousands of job seekers and employers building meaningful careers on HireHub.',
  primaryTo = '/jobs',
  primaryLabel = 'Find Jobs',
  secondaryTo = '/employer/jobs/create',
  secondaryLabel = 'Post a Job',
}) {
  const [ref, inView] = useInView({ once: true, threshold: 0.2 })

  return (
    <section ref={ref} className={`hh-final-cta-section ${inView ? 'is-inview' : ''}`}>
      <div className="page-container">
        <div className="hh-final-cta-banner">
          <div>
            <div
              className="small text-uppercase fw-semibold tracking-wide text-white mb-2 hh-cta-reveal"
              style={{ '--hh-cta-delay': '0ms' }}
            >
              {eyebrow}
            </div>
            <h2
              className="hh-final-cta-title hh-cta-reveal"
              style={{ '--hh-cta-delay': '100ms' }}
            >
              {title}
            </h2>
            <p
              className="hh-final-cta-subtitle hh-cta-reveal"
              style={{ '--hh-cta-delay': '200ms' }}
            >
              {subtitle}
            </p>
          </div>

          <div
            className="hh-final-cta-actions hh-cta-reveal"
            style={{ '--hh-cta-delay': '300ms' }}
          >
            <Link
              to={primaryTo}
              className="hh-btn hh-btn-white hh-btn-lg hh-btn-pill hh-cta-btn-fill"
            >
              {primaryLabel} <i className="bi bi-arrow-right hh-btn-arrow ms-1" aria-hidden="true" />
            </Link>
            <Link
              to={secondaryTo}
              className="hh-btn hh-btn-outline-white hh-btn-lg hh-btn-pill hh-cta-btn-ghost"
            >
              {secondaryLabel} <i className="bi bi-arrow-right hh-btn-arrow ms-1" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}