import { Link } from 'react-router-dom'
import useInView from '../../hooks/useInView'

export default function FinalCtaSection() {
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
              READY TO TAKE THE NEXT STEP?
            </div>
            <h2
              className="hh-final-cta-title hh-cta-reveal"
              style={{ '--hh-cta-delay': '100ms' }}
            >
              Your Future Starts Here
            </h2>
            <p
              className="hh-final-cta-subtitle hh-cta-reveal"
              style={{ '--hh-cta-delay': '200ms' }}
            >
              Join thousands of job seekers and employers building meaningful careers on HireHub.
            </p>
          </div>

          <div
            className="hh-final-cta-actions hh-cta-reveal"
            style={{ '--hh-cta-delay': '300ms' }}
          >
            <Link
              to="/jobs"
              className="hh-btn hh-btn-white hh-btn-lg hh-btn-pill hh-cta-btn-fill"
            >
              Find Jobs <i className="bi bi-arrow-right hh-btn-arrow ms-1" aria-hidden="true" />
            </Link>
            <Link
              to="/employer/jobs/create"
              className="hh-btn hh-btn-outline-white hh-btn-lg hh-btn-pill hh-cta-btn-ghost"
            >
              Post a Job <i className="bi bi-arrow-right hh-btn-arrow ms-1" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}