import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicJobs } from '../../data/jobs'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { formatSalaryAmount, formatSalaryPeriod } from '../../utils/jobs'

const SAVED_DATES = {
  'job-1': 'September 16',
  'job-3': 'September 12',
  'job-5': 'September 9',
  'job-6': 'September 2',
}

const INITIAL_SAVED = ['job-1', 'job-3', 'job-5', 'job-6']

export default function SeekerSavedJobsPage() {
  const [savedIds, setSavedIds] = useState(INITIAL_SAVED)

  const savedJobs = useMemo(
    () => savedIds.map((id) => publicJobs.find((j) => j.id === id)).filter(Boolean),
    [savedIds]
  )

  const removeJob = (id) => {
    setSavedIds((prev) => prev.filter((j) => j !== id))
  }

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <SectionHeading
              eyebrow="JOB SEEKER DASHBOARD"
              title="Saved jobs"
              subtitle="Keep track of opportunities you're interested in."
            />
          </Reveal>

          {savedJobs.length > 0 ? (
            <Reveal>
              <Card className="hh-card-body">
                {savedJobs.map((job) => (
                  <div className="hh-app-row" key={job.id}>
                    <div
                      className="hh-app-logo"
                      style={{
                        background: job.company?.logoBg || 'var(--hh-bg-soft)',
                        color: job.company?.logoColor || 'var(--hh-primary)',
                      }}
                    >
                      {job.company?.logoText || job.company?.name?.charAt(0)}
                    </div>
                    <div className="hh-app-info">
                      <Link to={`/jobs/${job.id}`} className="hh-app-title">{job.title}</Link>
                      <div className="hh-app-company">{job.company?.name}</div>
                      <div className="hh-app-meta">
                        <span><i className="bi bi-geo-alt hh-me-1" aria-hidden="true" />{job.location}</span>
                        <span><i className="bi bi-cash-stack hh-me-1" aria-hidden="true" />{formatSalaryAmount(job.salary)} · {formatSalaryPeriod(job.salary)}</span>
                        <span><i className="bi bi-bookmark hh-me-1" aria-hidden="true" />Saved {SAVED_DATES[job.id] || 'Recently'}</span>
                      </div>
                    </div>
                    <div className="hh-app-action">
                      <Button to={`/jobs/${job.id}`} variant="primary" size="sm" pill>Apply now</Button>
                      <button
                        type="button"
                        className="hh-btn hh-btn-ghost hh-btn-sm"
                        onClick={() => removeJob(job.id)}
                      >
                        <i className="bi bi-trash" aria-hidden="true" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </Card>
            </Reveal>
          ) : (
            <Reveal>
              <EmptyState
                icon="bookmark"
                title="You haven't saved any jobs yet"
                text="Save jobs you're interested in so you can review them later and apply when you're ready."
                action={
                  <Button to="/seeker/browse-jobs" variant="primary" pill>Explore jobs</Button>
                }
              />
            </Reveal>
          )}
        </div>
      </section>
    </>
  )
}