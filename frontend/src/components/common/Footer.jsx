import { Link } from 'react-router-dom'
import logoImg from '../../assets/hirehub_logo.png'

export default function Footer() {
  const handleSubmitNewsletter = (e) => {
    e.preventDefault()
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
              <a href="#linkedin" className="hh-footer-social-btn" aria-label="LinkedIn">
                <i className="bi bi-linkedin" />
              </a>
              <a href="#twitter" className="hh-footer-social-btn" aria-label="X / Twitter">
                <i className="bi bi-twitter-x" />
              </a>
              <a href="#facebook" className="hh-footer-social-btn" aria-label="Facebook">
                <i className="bi bi-facebook" />
              </a>
              <a href="#instagram" className="hh-footer-social-btn" aria-label="Instagram">
                <i className="bi bi-instagram" />
              </a>
              <a href="#youtube" className="hh-footer-social-btn" aria-label="YouTube">
                <i className="bi bi-youtube" />
              </a>
            </div>
          </div>

          <div className="col-6 col-md-4 col-lg-2">
            <h3 className="hh-footer-title">For Job Seekers</h3>
            <ul className="hh-footer-links">
              <li><Link to="/jobs" className="hh-footer-link">Browse Jobs</Link></li>
              <li><Link to="/register/job-seeker" className="hh-footer-link">Create Profile</Link></li>
              <li><Link to="/seeker/saved-jobs" className="hh-footer-link">Saved Jobs</Link></li>
              <li><Link to="/seeker/applications" className="hh-footer-link">Application Tracker</Link></li>
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
              <li><Link to="/about" className="hh-footer-link">Privacy Policy</Link></li>
              <li><Link to="/about" className="hh-footer-link">Terms of Service</Link></li>
            </ul>
          </div>

          <div className="col-12 col-md-8 col-lg-3">
            <h3 className="hh-footer-title">Subscribe to our Newsletter</h3>
            <p className="hh-text-muted fs-6 mb-3">
              Get the latest jobs and career tips.
            </p>
            <form onSubmit={handleSubmitNewsletter}>
              <div className="input-group">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter your email address"
                  aria-label="Email address for newsletter"
                  required
                />
                <button
                  type="submit"
                  className="hh-btn hh-btn-primary"
                  aria-label="Subscribe to newsletter"
                >
                  <i className="bi bi-arrow-right" />
                </button>
              </div>
            </form>
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
