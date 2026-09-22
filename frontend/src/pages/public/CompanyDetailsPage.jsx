import { Link, useParams } from 'react-router-dom'
import { companiesApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import JobCard from '../../components/ui/JobCard'
import Reveal from '../../components/ui/Reveal'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import PageHero from '../../components/ui/PageHero'
import heroSlide1 from '../../assets/company1.jpg'
import heroSlide2 from '../../assets/company3.jpg'
import heroSlide3 from '../../assets/company4.jpg'

const heroSlides = [heroSlide1, heroSlide2, heroSlide3]

export default function CompanyDetailsPage() {
  const { id } = useParams()
  const { data: company, loading, error } = useApiData(() => companiesApi.bySlug(id), [id])

  if (loading) {
    return (
      <section className="page-container hh-py-6">
        <div className="hh-loading-block">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          Loading company…
        </div>
      </section>
    )
  }

  if (!company) {
    return (
      <section className="page-container">
        <EmptyState
          icon={error ? 'wifi-off' : 'buildings'}
          title={error ? 'Could not load company' : 'Company not found'}
          text={error ? 'There was a problem connecting to the company directory.' : 'This company profile may not exist or was removed.'}
          action={<Button to="/companies" variant="primary">Browse companies</Button>}
        />
      </section>
    )
  }

  const openJobs = company.jobs ?? []
  const featuredJobs = openJobs

  const foundedFrom = company.founded || null

  return (
    <>
      <PageHero images={heroSlides} deep>
        <div className="hh-mb-4">
          <Link to="/companies" className="hh-btn hh-btn-outline-white hh-btn-sm hh-btn-pill">
            <i className="bi bi-arrow-left" aria-hidden="true" />
            Back to companies
          </Link>
        </div>

        <Reveal>
          <div className="hh-detail-title-row hh-mb-3">
            <div
              className="hh-company-detail-logo"
              style={{
                background: company.logoBg || '#ffffff',
                color: company.logoColor || 'var(--hh-primary)',
              }}
              aria-hidden="true"
            >
              {company.logoText || company.name.charAt(0)}
            </div>
            <div>
              <h1 className="hh-page-hero-title hh-mb-2">
                {company.name}
                {company.is_verified && (
                  <i
                    className="bi bi-patch-check-fill ms-2 hh-on-dark-accent"
                    aria-label="Verified company"
                  />
                )}
              </h1>
              <p className="hh-page-hero-text">{company.tagline}</p>
            </div>
          </div>

          <div className="hh-toolbar">
            <Badge variant="primary" dot>{company.industry}</Badge>
            <span className="hh-small hh-on-dark-muted">
              <i className="bi bi-geo-alt me-1" aria-hidden="true" />
              {company.location}
            </span>
            <span className="hh-small hh-on-dark-muted">
              <i className="bi bi-people me-1" aria-hidden="true" />
              {company.size}
            </span>
          </div>
        </Reveal>
      </PageHero>

      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <div className="hh-stat-band hh-mb-5">
              <div className="hh-stat-tile">
                <span className="hh-stat-tile-icon" aria-hidden="true">
                  <i className="bi bi-briefcase" />
                </span>
                <span className="hh-stat-tile-value">{openJobs.length ?? 0}</span>
                <span className="hh-stat-tile-label">Open jobs</span>
              </div>
              <div className="hh-stat-tile">
                <span className="hh-stat-tile-icon" aria-hidden="true">
                  <i className="bi bi-star" />
                </span>
                <span className="hh-stat-tile-value">{company.rating ?? '—'}</span>
                <span className="hh-stat-tile-label">Rating</span>
              </div>
              <div className="hh-stat-tile">
                <span className="hh-stat-tile-icon" aria-hidden="true">
                  <i className="bi bi-chat-square-text" />
                </span>
                <span className="hh-stat-tile-value">{company.reviews_count ?? 0}</span>
                <span className="hh-stat-tile-label">Reviews</span>
              </div>
              {foundedFrom ? (
                <div className="hh-stat-tile">
                  <span className="hh-stat-tile-icon" aria-hidden="true">
                    <i className="bi bi-calendar3" />
                  </span>
                  <span className="hh-stat-tile-value">{foundedFrom}</span>
                  <span className="hh-stat-tile-label">Founded</span>
                </div>
              ) : (
                <div className="hh-stat-tile">
                  <span className="hh-stat-tile-icon" aria-hidden="true">
                    <i className="bi bi-file-spreadsheet" />
                  </span>
                  <span className="hh-stat-tile-value">{company.open_jobs_count ?? 0}</span>
                  <span className="hh-stat-tile-label">Active listings</span>
                </div>
              )}
            </div>
          </Reveal>

          <div className="hh-detail-grid">
            <div>
              <Reveal>
                <div className="hh-detail-card hh-mb-4">
                  <h2>
                    <span className="hh-detail-card-icon" aria-hidden="true">
                      <i className="bi bi-buildings" />
                    </span>
                    About {company.name}
                  </h2>
                  <p>{company.description}</p>
                </div>
              </Reveal>

              <div className="hh-mb-4">
                <Reveal>
                  <div className="hh-toolbar hh-toolbar-between hh-mb-4">
                    <h2 className="hh-section-title mb-0">Open positions</h2>
                    <span className="hh-result-count">{openJobs.length} role(s)</span>
                  </div>
                </Reveal>

                {openJobs.length > 0 ? (
                  <div className="row g-4">
                    {openJobs.map((job, index) => (
                      <div className="col-12 col-md-6" key={job.id}>
                        <JobCard job={job} index={index} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="briefcase"
                    title="No open positions right now"
                    text="This company is not actively hiring on HireHub at the moment."
                    action={
                      <Button to="/jobs" variant="outline">
                        Browse all jobs
                      </Button>
                    }
                  />
                )}
              </div>
            </div>

            <div className="hh-sticky-sidebar">
              <Reveal>
                <div className="hh-sidebar-card hh-company-info-card">
                  <h3>
                    <span className="hh-detail-card-icon" aria-hidden="true">
                      <i className="bi bi-info-circle" />
                    </span>
                    Company information
                  </h3>
                  <ul className="hh-meta-list">
                    <li>
                      <i className="bi bi-building" aria-hidden="true" />
                      <span>Industry: </span>
                      {company.industry}
                    </li>
                    <li>
                      <i className="bi bi-geo-alt" aria-hidden="true" />
                      <span>Location: </span>
                      {company.location}
                    </li>
                    <li>
                      <i className="bi bi-people" aria-hidden="true" />
                      <span>Company size: </span>
                      {company.size}
                    </li>
                    {foundedFrom && (
                      <li>
                        <i className="bi bi-calendar3" aria-hidden="true" />
                        <span>Founded: </span>
                        {foundedFrom}
                      </li>
                    )}
                    <li>
                      <i className="bi bi-star" aria-hidden="true" />
                      <span>Rating: </span>
                      {company.rating ?? '—'} ({company.reviews_count ?? 0} reviews)
                    </li>
                    {company.website && (
                      <li>
                        <i className="bi bi-globe2" aria-hidden="true" />
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hh-small hh-text-primary"
                        >
                          {company.website.replace(/^https?:\/\//, '')}
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              </Reveal>

              <Reveal>
                <div className="hh-sidebar-card">
                  <h3>
                    <span className="hh-detail-card-icon" aria-hidden="true">
                      <i className="bi bi-compass" />
                    </span>
                    Explore more
                  </h3>
                  <Button to="/jobs" block variant="primary" className="hh-mb-3">
                    <i className="bi bi-search" aria-hidden="true" />
                    Find jobs
                  </Button>
                  <Button to="/employer/jobs/create" block variant="outline">
                    <i className="bi bi-plus-lg" aria-hidden="true" />
                    Post a job
                  </Button>
                </div>
              </Reveal>
            </div>
          </div>

          {featuredJobs.length > 0 && openJobs.length === 0 && (
            <div className="hh-mt-5">
              <Reveal>
                <h2 className="hh-section-title hh-mb-4">Featured jobs on HireHub</h2>
              </Reveal>
              <div className="row g-4">
                {featuredJobs.map((job, index) => (
                  <div className="col-12 col-md-6 col-lg-4" key={job.id}>
                    <JobCard job={job} index={index} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}