import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { seekerApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import { formatSalaryAmount, formatSalaryPeriod } from '../../utils/jobs'
import { formatDate } from '../../utils/format'

function savedLabel(job) {
  return job.saved_at ? `Saved ${formatDate(job.saved_at)}` : 'Saved Recently'
}

export default function SeekerSavedJobsPage() {
  const { data: savedJobs, loading, error, reload } = useApiData(() => seekerApi.savedJobs(), [])

  const removeJob = async (job) => {
    try {
      await seekerApi.unSaveJob(job.id)
    } catch {
      // ignore remove errors, refresh state regardless
    }
    reload()
  }

  const rows = useMemo(() => savedJobs ?? [], [savedJobs])

  if (loading) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <LoadingState text="Loading saved jobs…" />
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
              title="Couldn't load saved jobs"
              text="Something went wrong while fetching your saved jobs. Please try again."
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

          {rows.length > 0 ? (
            <Reveal>
              <Card className="hh-card-body">
                {rows.map((job) => (
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
                      <Link to={`/jobs/${job.slug || job.id}`} className="hh-app-title">{job.title}</Link>
                      <div className="hh-app-company">{job.company?.name}</div>
                      <div className="hh-app-meta">
                        <span><i className="bi bi-geo-alt hh-me-1" aria-hidden="true" />{job.location}</span>
                        <span><i className="bi bi-cash-stack hh-me-1" aria-hidden="true" />{formatSalaryAmount(job.salary)} · {formatSalaryPeriod(job.salary)}</span>
                        <span><i className="bi bi-bookmark hh-me-1" aria-hidden="true" />{savedLabel(job)}</span>
                      </div>
                    </div>
                    <div className="hh-app-action">
                      <Button to={`/jobs/${job.slug || job.id}`} variant="primary" size="sm" pill>Apply now</Button>
                      <button
                        type="button"
                        className="hh-btn hh-btn-ghost hh-btn-sm"
                        onClick={() => removeJob(job)}
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