import { useState } from 'react'
import { Link } from 'react-router-dom'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Alert from '../../components/ui/Alert'
import JobPostingForm from './JobPostingForm'

const ACTION_MESSAGES = {
  draft: 'Draft saved. Your job posting will stay unpublished until you publish it.',
  preview: 'Preview mode on — this posting has not been published yet.',
  publish: 'Your job has been published and is now live.',
}

export default function EmployerCreateJobPage() {
  const [result, setResult] = useState(null)

  const handleSave = (values) => {
    setResult(values.action)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <div className="hh-toolbar hh-toolbar-between hh-mb-4">
            <SectionHeading
              eyebrow="EMPLOYER"
              title="Post a new job"
              subtitle="Create a listing and start receiving qualified applications."
            />
            <Link to="/employer/jobs" className="hh-btn hh-btn-outline-primary hh-btn-pill">
              <i className="bi bi-arrow-left hh-me-1" aria-hidden="true" />
              Back to my jobs
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
            submitLabel="Publish job"
            onSave={handleSave}
          />
        </div>
      </section>
    </>
  )
}