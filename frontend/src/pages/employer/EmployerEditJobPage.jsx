import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { employerApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import PageHeader from '../../components/ui/PageHeader'
import Reveal from '../../components/ui/Reveal'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import LoadingState from '../../components/ui/LoadingState'
import JobPostingForm, { buildJobPayload } from './JobPostingForm'

const ACTION_MESSAGES = {
  draft: 'Draft saved. Your changes have not been published yet.',
  preview: 'Preview mode on — your changes are not live yet.',
}

export default function EmployerEditJobPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApiData(() => employerApi.jobs(), [])
  const [result, setResult] = useState(null)
  const [submitError, setSubmitError] = useState(false)

  const job = useMemo(
    () => (data?.items ?? []).find((item) => item.slug === id || item.id === id) ?? null,
    [data, id]
  )

  const handleSave = async (values) => {
    if (values.action !== 'publish') {
      setResult(values.action)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSubmitError(false)
    try {
      await employerApi.updateJob(job.slug, buildJobPayload(values))
      navigate('/employer/jobs')
    } catch {
      setSubmitError(true)
    }
  }

  if (loading) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <LoadingState text="Loading job details…" />
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
              title="Couldn't load this job"
              text="Something went wrong while fetching this posting. Please try again."
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

  if (!job) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <EmptyState
            icon="briefcase"
            title="Job not found"
            text="This job posting may have been removed or the link is incorrect."
          />
          <div className="text-center hh-mt-4">
            <Button to="/employer/jobs" variant="outline-primary">
              Back to my jobs
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <PageHeader
            eyebrow="EMPLOYER"
            title="Edit job"
            subtitle={`Update the details for ${job.title}.`}
            action={
              <Link to={`/employer/jobs/${job.slug || job.id}`} className="hh-btn hh-btn-outline-primary hh-btn-pill">
                <i className="bi bi-arrow-left hh-me-1" aria-hidden="true" />
                Back to job
              </Link>
            }
          />

          <Reveal>
            {result && (
              <Alert variant="success" dismissible onDismiss={() => setResult(null)} className="hh-mb-4">
                {ACTION_MESSAGES[result]}
              </Alert>
            )}
            {submitError && (
              <Alert variant="danger" dismissible onDismiss={() => setSubmitError(false)} className="hh-mb-4">
                Couldn't save your changes. Please check the details and try again.
              </Alert>
            )}
          </Reveal>

          <JobPostingForm
            job={job}
            submitLabel="Save changes"
            onSave={handleSave}
          />
        </div>
      </section>
    </>
  )
}