import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { employerApi } from '../../services/api'
import PageHeader from '../../components/ui/PageHeader'
import Reveal from '../../components/ui/Reveal'
import Alert from '../../components/ui/Alert'
import JobPostingForm, { buildJobPayload } from './JobPostingForm'

const ACTION_MESSAGES = {
  draft: 'Draft saved. Your job posting will stay unpublished until you publish it.',
  preview: 'Preview mode on — this posting has not been published yet.',
}

export default function EmployerCreateJobPage() {
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [submitError, setSubmitError] = useState(false)

  const handleSave = async (values) => {
    if (values.action !== 'publish') {
      setResult(values.action)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSubmitError(false)
    try {
      await employerApi.createJob(buildJobPayload(values))
      navigate('/employer/jobs')
    } catch {
      setSubmitError(true)
    }
  }

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <PageHeader
            eyebrow="EMPLOYER"
            title="Post a new job"
            subtitle="Create a listing and start receiving qualified applications."
            action={
              <Link to="/employer/jobs" className="hh-btn hh-btn-outline-primary hh-btn-pill">
                <i className="bi bi-arrow-left hh-me-1" aria-hidden="true" />
                Back to my jobs
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
                Couldn't publish your job. Please check the details and try again.
              </Alert>
            )}
          </Reveal>

          <JobPostingForm
            submitLabel="Publish job"
            onSave={handleSave}
          />
        </div>
      </section>
    </>
  )
}