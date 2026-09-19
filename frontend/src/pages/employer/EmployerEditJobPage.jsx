import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPublicJobById } from '../../data/jobs'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import JobPostingForm from './JobPostingForm'

const ACTION_MESSAGES = {
  draft: 'Draft saved. Your changes have not been published yet.',
  preview: 'Preview mode on — your changes are not live yet.',
  publish: 'Your changes have been published. The job listing is now live.',
}

export default function EmployerEditJobPage() {
  const { id } = useParams()
  const job = getPublicJobById(id)
  const [result, setResult] = useState(null)

  const handleSave = (values) => {
    setResult(values.action)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
          <div className="hh-toolbar hh-toolbar-between hh-mb-4">
            <SectionHeading
              eyebrow="EMPLOYER"
              title="Edit job"
              subtitle={`Update the details for ${job.title}.`}
            />
            <Link to={`/employer/jobs/${job.id}`} className="hh-btn hh-btn-outline-primary hh-btn-pill">
              <i className="bi bi-arrow-left hh-me-1" aria-hidden="true" />
              Back to job
            </Link>
          </div>

          <Reveal>
            {result && (
              <Alert variant="success" dismissible onDismiss={() => setResult(null)} className="hh-mb-4">
                {ACTION_MESSAGES[result]}
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