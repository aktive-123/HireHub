import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../../components/ui/Reveal'
import HeroSlideshow from '../../components/ui/HeroSlideshow'
import { useAuth } from '../../context/AuthContext'
import { companiesApi, jobsApi } from '../../services/api'
import employerHero1 from '../../assets/hero2.jpg'
import employerHero2 from '../../assets/hero5.jpg'
import employerHero3 from '../../assets/growth.jpg'

const HERO_IMAGES = [employerHero1, employerHero2, employerHero3]

const VALUE_PROPS = [
  {
    icon: 'bullseye',
    title: 'Reach Qualified Talent',
    desc: 'Your role is shown to candidates who match its skills and salary, not a firehose of resumes nobody has time to read.',
  },
  {
    icon: 'lightning-charge',
    title: 'Simplify Your Hiring Process',
    desc: 'Post a role in minutes, screen applicants in one list, and move candidates forward without juggling five different tools.',
  },
  {
    icon: 'people',
    title: 'Manage Applicants Easily',
    desc: 'Shortlist, reject and interview from a single pipeline, where every status change stays visible to your whole team.',
  },
  {
    icon: 'award',
    title: 'Build Your Employer Brand',
    desc: 'A verified company profile and real job previews give candidates a reason to apply before they even open the listing.',
  },
]

const STEPS = [
  {
    num: 1,
    icon: 'building',
    title: 'Create Your Company',
    desc: 'Register as an employer and get a verified profile candidates can trust.',
  },
  {
    num: 2,
    icon: 'megaphone',
    title: 'Post Your Job',
    desc: 'Describe the role, set the salary and requirements, and publish it.',
  },
  {
    num: 3,
    icon: 'inbox',
    title: 'Review Applicants',
    desc: 'Read CVs, shortlist the strongest matches and reject the rest quickly.',
  },
  {
    num: 4,
    icon: 'calendar-check',
    title: 'Interview & Hire',
    desc: 'Schedule interviews, record outcomes and send an offer from one place.',
  },
]

/**
 * Employer-facing landing page.
 *
 * The proof numbers are read from the public jobs and companies endpoints
 * rather than written into the copy: hard coded counts on a marketing page are
 * the fastest way to make a site look abandoned, so these are the same rows the
 * rest of the product is showing. When a fetch fails the strip is omitted
 * rather than rendered as "0", which would be a false claim rather than a gap.
 */
export default function EmployerLandingPage() {
  const { isAuthenticated, role } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let active = true

    Promise.all([jobsApi.list({ per_page: 1 }), companiesApi.list({ per_page: 1 })])
      .then(([jobs, companies]) => {
        if (!active) return
        setStats({
          jobs: jobs.meta?.total ?? jobs.items?.length ?? 0,
          companies: companies.meta?.total ?? companies.items?.length ?? 0,
        })
      })
      .catch(() => {
        if (active) setStats(null)
      })

    return () => {
      active = false
    }
  }, [])

  const postAJob = isAuthenticated && role === 'employer' ? '/employer/jobs/create' : '/register/employer'
  const exploreSolutions = isAuthenticated ? '/employer' : '/pricing'

  return (
    <>
      <section className="hh-hero hh-hero--article" aria-labelledby="employer-hero-title">
        <HeroSlideshow images={HERO_IMAGES} />
        <div className="page-container">
          <div className="row align-items-center g-5">
            <div className="col-12 col-lg-7">
              <Reveal>
                <div className="hh-section-eyebrow text-info">FOR EMPLOYERS</div>
              </Reveal>
              <Reveal delay={80}>
                <h1 id="employer-hero-title" className="hh-hero-title">
                  Find the People Who Will Move Your Business Forward
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="hh-hero-subtitle">
                  Reach qualified professionals and build your team with HireHub.
                </p>
              </Reveal>
              <Reveal delay={240}>
                <div className="hh-hero-cta-group">
                  <Link
                    to={postAJob}
                    className="hh-btn hh-btn-white hh-btn-lg hh-btn-pill hh-hero-cta-btn"
                  >
                    Post a Job <i className="bi bi-arrow-right hh-btn-arrow" aria-hidden="true" />
                  </Link>
                  <Link
                    to={exploreSolutions}
                    className="hh-btn hh-btn-outline-white hh-btn-lg hh-btn-pill hh-hero-cta-btn"
                  >
                    Explore Hiring Solutions
                  </Link>
                </div>
              </Reveal>

              {stats && (
                <Reveal delay={320}>
                  <div className="hh-hero-stats">
                    <div className="hh-hero-stat">
                      <span className="hh-hero-stat-value">{stats.jobs.toLocaleString()}</span>
                      <span className="hh-hero-stat-label">Open roles</span>
                    </div>
                    <div className="hh-hero-stat">
                      <span className="hh-hero-stat-value">
                        {stats.companies.toLocaleString()}
                      </span>
                      <span className="hh-hero-stat-label">Hiring companies</span>
                    </div>
                  </div>
                </Reveal>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="hh-why-section" aria-labelledby="employer-value-title">
        <div className="page-container">
          <div className="text-center mb-5">
            <div className="hh-section-eyebrow">WHY HIREHUB</div>
            <h2 id="employer-value-title" className="hh-section-title hh-section-title--white">
              Everything you need to hire well
            </h2>
            <p className="hh-hero-subtitle mb-0">
              The four things employers tell us they value most about hiring on HireHub.
            </p>
          </div>

          <div className="row g-3 justify-content-center">
            {VALUE_PROPS.map((prop, index) => (
              <div key={prop.title} className="col-12 col-md-6 col-lg-3">
                <Reveal delay={index * 100}>
                  <div className="hh-why-feature-card h-100">
                    <div className="hh-why-feature-icon">
                      <i className={`bi bi-${prop.icon}`} aria-hidden="true" />
                    </div>
                    <h3 className="hh-why-feature-title">{prop.title}</h3>
                    <p className="hh-why-feature-desc">{prop.desc}</p>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="hh-how-section" aria-labelledby="employer-steps-title">
        <div className="page-container">
          <div className="text-center mb-5">
            <div className="hh-section-eyebrow">HOW IT WORKS</div>
            <h2 id="employer-steps-title" className="hh-section-title">
              From job post to offer in 4 steps
            </h2>
            <p className="hh-section-subtitle mx-auto">
              No onboarding calls and no per-seat pricing surprises. Start hiring the same day you
              sign up.
            </p>
          </div>

          <div className="row g-4 justify-content-center">
            {STEPS.map((step, index) => (
              <div key={step.num} className="col-12 col-sm-6 col-lg-3">
                <Reveal delay={index * 120}>
                  <div className="hh-step-card">
                    <div className="hh-step-icon-wrapper">
                      <i className={`bi bi-${step.icon}`} aria-hidden="true" />
                      <span className="hh-step-number">{step.num}</span>
                    </div>
                    <h3 className="hh-step-title">{step.title}</h3>
                    <p className="hh-step-desc">{step.desc}</p>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="hh-final-cta-section" aria-labelledby="employer-cta-title">
        <div className="page-container">
          <div className="hh-final-cta-banner">
            <div className="small text-uppercase fw-semibold tracking-wide text-white mb-2">
              GET STARTED
            </div>
            <h2 id="employer-cta-title" className="hh-final-cta-title">
              Start Hiring Today
            </h2>
            <p className="hh-final-cta-subtitle">
              Create a free employer account, post your first job and start receiving applications
              today.
            </p>
            <div className="hh-final-cta-actions">
              <Link
                to={postAJob}
                className="hh-btn hh-btn-white hh-btn-lg hh-btn-pill hh-cta-btn-fill"
              >
                Start Hiring Today{' '}
                <i className="bi bi-arrow-right hh-btn-arrow ms-1" aria-hidden="true" />
              </Link>
              <Link
                to="/contact"
                className="hh-btn hh-btn-outline-white hh-btn-lg hh-btn-pill hh-cta-btn-ghost"
              >
                Talk to Sales
              </Link>
            </div>
            <p className="hh-final-cta-subtitle mt-4 mb-0">
              Already have an account?{' '}
              <Link to="/login" className="text-white text-decoration-underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
