import { useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from '../ui/Reveal'

const FEATURED_JOBS = [
  {
    id: 'job-1',
    company: 'Google',
    verified: true,
    logoText: 'G',
    logoBg: '#ffffff',
    logoColor: '#4285f4',
    title: 'Frontend Developer',
    location: 'Lagos, Nigeria',
    workplace: 'Remote',
    employmentType: 'Full-time',
    level: 'Mid Level',
    salary: { min: 80000, max: 120000, period: 'year' },
  },
  {
    id: 'job-2',
    company: 'Microsoft',
    verified: true,
    logoText: 'M',
    logoBg: '#f8fafc',
    logoColor: '#00a4ef',
    title: 'Backend Developer',
    location: 'Abuja, Nigeria',
    workplace: 'On-site',
    employmentType: 'Full-time',
    level: 'Senior',
    salary: { min: 70000, max: 100000, period: 'year' },
  },
  {
    id: 'job-3',
    company: 'Flutterwave',
    verified: true,
    logoText: 'F',
    logoBg: '#fff7ed',
    logoColor: '#f97316',
    title: 'Product Designer',
    location: 'Lagos, Nigeria',
    workplace: 'Remote',
    employmentType: 'Contract',
    level: 'Mid Level',
    salary: { min: 40000, max: 70000, period: 'month' },
  },
  {
    id: 'job-4',
    company: 'Dangote',
    verified: true,
    logoText: 'D',
    logoBg: '#f0fdf4',
    logoColor: '#15803d',
    title: 'Data Analyst',
    location: 'Lagos, Nigeria',
    workplace: 'On-site',
    employmentType: 'Full-time',
    level: 'Entry Level',
    salary: { min: 50000, max: 75000, period: 'year' },
  },
]

export default function FeaturedJobsSection() {
  const [savedJobs, setSavedJobs] = useState({})

  const toggleSaveJob = (id) => {
    setSavedJobs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        {/* Header Row */}
        <div className="d-flex align-items-end justify-content-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="hh-section-title mb-2">Featured Jobs</h2>
            <p className="hh-section-subtitle">
              Handpicked opportunities from top companies. Find the right role for your skills and goals.
            </p>
          </div>
          <Link to="/jobs" className="hh-btn hh-btn-outline-primary hh-btn-sm hh-btn-pill">
            View all jobs <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
          </Link>
        </div>

        {/* 4 Job Cards Grid */}
        <div className="row g-4">
          {FEATURED_JOBS.map((job, index) => {
            const isSaved = Boolean(savedJobs[job.id])
            return (
              <div key={job.id} className="col-12 col-md-6 col-lg-3">
                <Reveal delay={index * 100}>
                  <div className="hh-job-card">
                  <div className="hh-job-card-header">
                    <div className="hh-job-company-group">
                      <div className="hh-job-company-logo">
                        {job.logoText}
                      </div>
                      <div className="hh-job-company-name">
                        <span>{job.company}</span>
                        {job.verified && (
                          <i
                            className="bi bi-patch-check-fill text-primary"
                            title="Verified Company"
                            aria-label="Verified"
                          />
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`hh-job-bookmark-btn ${isSaved ? 'is-active' : ''}`}
                      onClick={() => toggleSaveJob(job.id)}
                      aria-label={isSaved ? 'Remove saved job' : 'Save job'}
                    >
                      <i className={`bi ${isSaved ? 'bi-bookmark-fill' : 'bi-bookmark'}`} />
                    </button>
                  </div>

                  <h3 className="hh-job-title">{job.title}</h3>

                  <div className="hh-job-location">
                    <i className="bi bi-geo-alt" aria-hidden="true" />
                    <span>{job.location} • {job.workplace}</span>
                  </div>

                  <div className="hh-job-badges">
                    <span className="hh-badge hh-badge-primary">
                      <span className="hh-badge-dot" aria-hidden="true" />
                      {job.employmentType}
                    </span>
                    <span className="hh-badge hh-badge-secondary">
                      {job.level}
                    </span>
                  </div>

                  <div className="hh-job-salary">
                    <span className="hh-job-salary-amount">
                      ${job.salary.min.toLocaleString('en-US')} – ${job.salary.max.toLocaleString('en-US')}
                    </span>
                    <span className="hh-job-pay-basis">per {job.salary.period}</span>
                  </div>

                  <Link
                    to={`/jobs/${job.id}`}
                    className="hh-btn hh-btn-primary hh-btn-block hh-btn-pill"
                  >
                    Apply Now
                  </Link>
                  </div>
                </Reveal>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
