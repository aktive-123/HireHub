import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { publicJobs, getPublicJobsByCompany } from '../../data/jobs'
import { publicCompanies } from '../../data/companies'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Pagination from '../../components/ui/Pagination'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

export default function EmployerDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [page, setPage] = useState(1)
  const pageSize = 6

  const company = publicCompanies[0]

  const myJobs = useMemo(() => {
    if (!company) return []
    return getPublicJobsByCompany(company.id)
  }, [company])

  const totalApplications = publicJobs.reduce((sum, job) => sum + (job.applications_count || 0), 0)

  const recentJobs = useMemo(() => publicJobs.slice(0, pageSize), [])
  const recentJobsToday = recentJobs.filter((j) => j.is_published).length

  const stats = useMemo(
    () => [
      { key: 'active_jobs', label: 'Active Jobs', value: recentJobsToday, icon: 'bi-briefcase', tone: 'primary' },
      { key: 'applications', label: 'Applications', value: totalApplications, icon: 'bi-file-earmark-text', tone: 'success' },
      { key: 'candidates', label: 'Total Candidates', value: company ? company.open_jobs_count + 12 : 0, icon: 'bi-people', tone: 'info' },
      { key: 'shortlisted', label: 'Shortlisted', value: 7, icon: 'bi-star', tone: 'warning' },
    ],
    [company, recentJobsToday, totalApplications]
  )

  const visibleJobs = myJobs.slice((page - 1) * pageSize, page * pageSize)

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <div className="hh-toolbar hh-toolbar-between hh-mb-4">
            <div>
              <SectionHeading
                eyebrow="EMPLOYER DASHBOARD"
                title="Welcome back"
                subtitle={company ? `Manage jobs and hire for ${company.name}.` : 'Manage your hiring from one place.'}
              />
            </div>
            {myJobs.length > 0 && (
              <Button to="/employer/jobs/create" variant="primary" icon="bi-plus-lg">
                Post a job
              </Button>
            )}
          </div>

          <div className="row g-4 hh-mb-5">
            {stats.map((stat, idx) => (
              <div className="col-12 col-sm-6 col-lg-3" key={stat.key}>
                <Reveal delay={idx * 60}>
                  <Card className="hh-stat-card hh-card-hover">
                    <div className="hh-stat-icon hh-stat-icon-primary">
                      <i className={`bi ${stat.icon}`} aria-hidden="true" />
                    </div>
                    <div className="hh-stat-value">{stat.value}</div>
                    <div className="hh-stat-label">{stat.label}</div>
                  </Card>
                </Reveal>
              </div>
            ))}
          </div>

          <div className="hh-tabs hh-mb-4" role="tablist" aria-label="Dashboard sections">
            {[
              ['overview', 'Overview'],
              ['jobs', 'My Jobs'],
              ['candidates', 'Candidates'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                className={`hh-tab ${activeTab === key ? 'is-active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <Reveal>
            {activeTab === 'overview' && (
              <div className="row g-4">
                <div className="col-12 col-lg-8">
                  <Card className="hh-card-body">
                    <div className="hh-card-title-md hh-mb-3">Recent activity</div>
                    {recentJobs.length > 0 ? (
                      recentJobs.map((job) => (
                        <div className="hh-activity-row" key={job.id}>
                          <div className="hh-activity-content">
                            <span className="hh-activity-title">{job.title}</span>
                            <span className="hh-activity-meta">{job.industry || 'General'} · {job.is_published ? 'Published' : 'Draft'}</span>
                          </div>
                          <Badge variant={job.is_published ? 'success' : 'secondary'}>
                            {job.is_published ? 'Live' : 'Draft'}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <EmptyState icon="activity" title="No activity yet" text="Post your first job to get started." />
                    )}
                  </Card>
                </div>
                <div className="col-12 col-lg-4">
                  <Card className="hh-card-body">
                    <div className="hh-card-title-md hh-mb-3">Quick links</div>
                    <nav className="hh-vert-list gap-2">
                      <Link to="/employer/jobs/create"><i className="bi bi-plus-circle hh-me-2" />Post a job</Link>
                      <Link to="/employer/jobs"><i className="bi bi-briefcase hh-me-2" />View all jobs</Link>
                      <Link to="/employer/applicants"><i className="bi bi-people hh-me-2" />Applications</Link>
                      <Link to="/employer/company"><i className="bi bi-building hh-me-2" />Company profile</Link>
                      <Link to="/employer/settings"><i className="bi bi-gear hh-me-2" />Settings</Link>
                    </nav>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'jobs' && (
              <Card className="hh-card-body">
                <div className="hh-card-title-md hh-mb-3">My Job Postings</div>
                {visibleJobs.length > 0 ? (
                  <>
                    {visibleJobs.map((job) => (
                      <div className="hh-activity-row" key={job.id}>
                        <div className="hh-activity-content">
                          <span className="hh-activity-title">{job.title}</span>
                          <span className="hh-activity-meta">{(job.applications || 0)} applications · {job.industry || 'General'}</span>
                        </div>
                        <Badge variant="success">Live</Badge>
                      </div>
                    ))}
                    <Pagination
                      currentPage={page}
                      totalPages={Math.max(1, Math.ceil(myJobs.length / pageSize))}
                      onPageChange={setPage}
                    />
                  </>
                ) : (
                  <EmptyState icon="briefcase" title="No jobs posted" text="Post your first job listing to start receiving applications." />
                )}
              </Card>
            )}

            {activeTab === 'candidates' && (
              <Card className="hh-card-body">
                <div className="hh-card-title-md hh-mb-3">Candidate Pipeline</div>
                <EmptyState icon="people" title="No candidates yet" text="Once applicants apply to your jobs, they will appear here." />
              </Card>
            )}
          </Reveal>
        </div>
      </section>
    </>
  )
}
