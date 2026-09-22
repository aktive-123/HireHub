import { Link } from 'react-router-dom'
import JobCard from '../ui/JobCard'
import { jobsApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'

export default function FeaturedJobsSection() {
  const { data: loaded, loading } = useApiData(() => jobsApi.list().then((r) => r.items), [])
  const jobs = (loaded ?? []).filter((job) => job.is_featured).slice(0, 4)

  if (loading) return null

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
          {jobs.map((job, index) => (
            <div key={job.id} className="col-12 col-md-6 col-lg-3">
              <JobCard job={job} index={index} featured />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}