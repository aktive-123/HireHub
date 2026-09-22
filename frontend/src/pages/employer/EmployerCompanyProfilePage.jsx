import { Link } from 'react-router-dom'
import { employerApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import PageHeader from '../../components/ui/PageHeader'
import Reveal from '../../components/ui/Reveal'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import LoadingState from '../../components/ui/LoadingState'

export default function EmployerCompanyProfilePage() {
  const { data: company, loading, error, reload } = useApiData(() => employerApi.company(), [])

  if (loading) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <LoadingState text="Loading company profile…" />
          </Reveal>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <EmptyState
              icon="exclamation-triangle"
              title="Couldn't load your company profile"
              text="Something went wrong while fetching your company. Please try again."
              action={
                <button type="button" className="hh-btn hh-btn-outline-primary hh-btn-pill" onClick={() => reload()}>
                  Try again
                </button>
              }
            />
          </Reveal>
        </div>
      </section>
    )
  }

  if (!company) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <EmptyState icon="building" title="No company profile" text="Set up your company profile to appear on HireHub." />
          <div className="text-center hh-mt-4">
            <Button to="/employer/company/edit" variant="primary" icon="bi-plus-lg">Set up company profile</Button>
          </div>
        </div>
      </section>
    )
  }

  const companySlug = company.slug || company.id

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <PageHeader
            eyebrow="EMPLOYER"
            title="Company profile"
            subtitle="Manage how your company appears to candidates."
            action={
              <div className="d-flex flex-wrap gap-2">
                <Link to={`/companies/${companySlug}`}>
                  <Button variant="outline-primary" icon="bi-box-arrow-up-right">View public profile</Button>
                </Link>
                <Link to="/employer/company/edit">
                  <Button variant="primary" icon="bi-pencil">Edit profile</Button>
                </Link>
              </div>
            }
          />

          <Reveal>
            <Card className="hh-card-body hh-mb-4">
              <div className="hh-profile-head">
                <span
                  className="hh-company-detail-logo"
                  style={{ background: company.logoBg, color: company.logoColor }}
                  aria-hidden="true"
                >
                  {company.logoText || company.name?.charAt(0)}
                </span>
                <div className="hh-profile-head-main">
                  <h2 className="hh-profile-name hh-mb-1">
                    {company.name}
                    {company.verified && <StatusBadge status="verified" className="ms-2" />}
                  </h2>
                  <div className="hh-profile-title-line">{company.tagline}</div>
                  <ul className="hh-meta-list hh-mt-2">
                    <li><i className="bi bi-diagram-3" aria-hidden="true" /><span>{company.industry}</span></li>
                    <li><i className="bi bi-geo-alt" aria-hidden="true" /><span>{company.location}</span></li>
                    <li><i className="bi bi-people" aria-hidden="true" /><span>{company.size}</span></li>
                    <li><i className="bi bi-calendar3" aria-hidden="true" /><span>Founded {company.founded}</span></li>
                    <li><i className="bi bi-globe2" aria-hidden="true" /><a href={company.website} target="_blank" rel="noreferrer">{company.website}</a></li>
                  </ul>
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal>
            <div className="hh-stat-band hh-mb-4">
              <div className="hh-stat-tile">
                <span className="hh-stat-tile-value">{Number(company.rating ?? 0).toFixed(1)}</span>
                <span className="hh-stat-tile-label">Rating</span>
              </div>
              <div className="hh-stat-tile">
                <span className="hh-stat-tile-value">{company.reviews_count}</span>
                <span className="hh-stat-tile-label">Reviews</span>
              </div>
              <div className="hh-stat-tile">
                <span className="hh-stat-tile-value">{company.open_jobs_count}</span>
                <span className="hh-stat-tile-label">Open jobs</span>
              </div>
              <div className="hh-stat-tile">
                <span className="hh-stat-tile-value">{company.founded}</span>
                <span className="hh-stat-tile-label">Founded</span>
              </div>
            </div>
          </Reveal>

          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <Reveal>
                <Card className="hh-card-body">
                  <div className="hh-profile-card-title">
                    <i className="bi bi-building" aria-hidden="true" />
                    <span className="hh-card-title-md hh-mb-0">About</span>
                  </div>
                  <p className="hh-settings-desc">{company.description}</p>
                </Card>
              </Reveal>
            </div>

            <div className="col-12 col-lg-4">
              <Reveal>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-card-title-md hh-mb-3">Quick links</div>
                  <nav className="hh-vert-list">
                    <Link to="/employer/company/edit"><i className="bi bi-pencil hh-me-2" />Edit company profile</Link>
                    <Link to={`/companies/${companySlug}`}><i className="bi bi-box-arrow-up-right hh-me-2" />View as a candidate</Link>
                    <Link to="/employer/jobs/create"><i className="bi bi-plus-circle hh-me-2" />Post a job</Link>
                    <Link to="/employer/jobs"><i className="bi bi-briefcase hh-me-2" />Manage job posts</Link>
                  </nav>
                </Card>
              </Reveal>

              <Reveal delay={40}>
                <Card className="hh-card-body">
                  <div className="hh-card-title-md hh-mb-3">Profile health</div>
                  <div className="hh-progress-label hh-mb-2">
                    <span>About</span><strong>Done</strong>
                  </div>
                  <div className="hh-progress hh-mb-3">
                    <div className="hh-progress-bar" style={{ width: '100%' }} />
                  </div>
                  <div className="hh-progress-label hh-mb-2">
                    <span>Branding</span><strong>Good</strong>
                  </div>
                  <div className="hh-progress hh-mb-3">
                    <div className="hh-progress-bar hh-progress-bar--accent" style={{ width: '75%' }} />
                  </div>
                  <div className="hh-progress-label hh-mb-2">
                    <span>Postings</span><strong>{company.open_jobs_count} live</strong>
                  </div>
                  <div className="hh-progress">
                    <div className="hh-progress-bar hh-progress-bar--success" style={{ width: '60%' }} />
                  </div>
                </Card>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}