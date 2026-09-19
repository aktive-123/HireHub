import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getApplicantById } from '../../data/applicants'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import FormSelect from '../../components/ui/FormSelect'
import Alert from '../../components/ui/Alert'
import { STATUS_VARIANT } from '../../data/applicants'

const MOVE_OPTIONS = [
  { value: 'new', label: 'Applied' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview', label: 'Interview' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
]

export default function EmployerApplicantDetailsPage() {
  const { id } = useParams()
  const candidate = getApplicantById(id)
  const [nextStatus, setNextStatus] = useState(candidate?.status || 'new')
  const [updated, setUpdated] = useState(false)

  if (!candidate) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <EmptyState icon="person-x" title="Candidate not found" text="This application may have been removed or the link is incorrect." />
          <div className="text-center hh-mt-4">
            <Button to="/employer/applicants" variant="outline-primary">Back to applicants</Button>
          </div>
        </div>
      </section>
    )
  }

  const handleMove = (e) => {
    e.preventDefault()
    setUpdated(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <div className="hh-toolbar hh-toolbar-between hh-mb-4">
              <SectionHeading eyebrow="EMPLOYER" title="Candidate profile" subtitle={`Application review for ${candidate.name}.`} />
              <Link to="/employer/applicants" className="hh-btn hh-btn-outline-primary hh-btn-pill">
                <i className="bi bi-arrow-left hh-me-1" aria-hidden="true" />
                Back to applicants
              </Link>
            </div>
          </Reveal>

          <Reveal>
            {updated && (
              <Alert variant="success" dismissible onDismiss={() => setUpdated(false)} className="hh-mb-4">
                Candidate moved to <strong>{MOVE_OPTIONS.find((o) => o.value === nextStatus)?.label}</strong>.
              </Alert>
            )}
          </Reveal>

          <Reveal>
            <Card className="hh-card-body hh-mb-4">
              <div className="hh-profile-head">
                <span className="hh-avatar hh-avatar-lg" aria-hidden="true">
                  {candidate.name.charAt(0)}
                </span>
                <div className="hh-profile-head-main">
                  <h2 className="hh-profile-name hh-mb-1">{candidate.name}</h2>
                  <div className="hh-profile-title-line">
                    <span>{candidate.role}</span>
                    <span className="hh-text-muted">·</span>
                    <span>{candidate.location} · {candidate.years}</span>
                    <Badge variant={STATUS_VARIANT[candidate.status] || 'secondary'}>{candidate.status}</Badge>
                    <Badge variant="primary">{candidate.match}% match</Badge>
                  </div>
                  <p className="hh-settings-desc hh-mt-2">Applied to <strong>{candidate.job}</strong> on {candidate.applied}. Notice: {candidate.notice}.</p>
                </div>
                <div className="hh-profile-head-actions">
                  <Button variant="outline-primary" icon="bi-download">Download CV</Button>
                  <Button variant="primary" icon="bi-chat-dots">Contact candidate</Button>
                </div>
              </div>
            </Card>
          </Reveal>

          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <Reveal>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-profile-card-title">
                    <i className="bi bi-person-lines-fill" aria-hidden="true" />
                    <span className="hh-card-title-md hh-mb-0">Professional summary</span>
                  </div>
                  <p className="hh-settings-desc">{candidate.summary}</p>
                </Card>
              </Reveal>

              <Reveal delay={40}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-profile-card-title">
                    <i className="bi bi-stars" aria-hidden="true" />
                    <span className="hh-card-title-md hh-mb-0">Skills</span>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {candidate.skills.map((skill) => (
                      <span className="hh-badge hh-badge-soft" key={skill}>{skill}</span>
                    ))}
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={80}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-profile-card-title">
                    <i className="bi bi-briefcase" aria-hidden="true" />
                    <span className="hh-card-title-md hh-mb-0">Experience</span>
                  </div>
                  {candidate.experience.map((entry) => (
                    <div className="hh-resume-entry" key={`${entry.role}-${entry.org}`}>
                      <div className="hh-resume-entry-title">{entry.role}</div>
                      <div className="hh-resume-entry-org">{entry.org} · {entry.period}</div>
                      <p className="hh-resume-entry-text">{entry.text}</p>
                    </div>
                  ))}
                </Card>
              </Reveal>

              <Reveal delay={120}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-profile-card-title">
                    <i className="bi bi-mortarboard" aria-hidden="true" />
                    <span className="hh-card-title-md hh-mb-0">Education</span>
                  </div>
                  {candidate.education.map((entry) => (
                    <div className="hh-resume-entry" key={entry.school}>
                      <div className="hh-resume-entry-title">{entry.degree}</div>
                      <div className="hh-resume-entry-org">{entry.school} · {entry.period}</div>
                    </div>
                  ))}
                </Card>
              </Reveal>

              {candidate.certifications.length > 0 && (
                <Reveal delay={160}>
                  <Card className="hh-card-body hh-mb-4">
                    <div className="hh-profile-card-title">
                      <i className="bi bi-patch-check" aria-hidden="true" />
                      <span className="hh-card-title-md hh-mb-0">Certifications</span>
                    </div>
                    <ul className="hh-list-checks hh-mb-0">
                      {candidate.certifications.map((cert) => (
                        <li key={cert}><i className="bi bi-check-circle-fill" aria-hidden="true" />{cert}</li>
                      ))}
                    </ul>
                  </Card>
                </Reveal>
              )}

              {candidate.portfolio.length > 0 && (
                <Reveal delay={200}>
                  <Card className="hh-card-body">
                    <div className="hh-profile-card-title">
                      <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                      <span className="hh-card-title-md hh-mb-0">Portfolio</span>
                    </div>
                    <nav className="hh-vert-list">
                      {candidate.portfolio.map((url) => (
                        <a href={`https://${url}`} target="_blank" rel="noreferrer" key={url}>
                          <i className="bi bi-link-45deg hh-me-2" />{url}
                        </a>
                      ))}
                    </nav>
                  </Card>
                </Reveal>
              )}
            </div>

            <div className="col-12 col-lg-4">
              <Reveal>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-card-title-md hh-mb-3">Contact</div>
                  <ul className="hh-meta-list">
                    <li><i className="bi bi-envelope" aria-hidden="true" /><span>{candidate.email}</span></li>
                    <li><i className="bi bi-telephone" aria-hidden="true" /><span>{candidate.phone}</span></li>
                    <li><i className="bi bi-geo-alt" aria-hidden="true" /><span>{candidate.location}</span></li>
                    <li><i className="bi bi-briefcase" aria-hidden="true" /><span>{candidate.years}</span></li>
                    <li><i className="bi bi-hourglass-split" aria-hidden="true" /><span>Notice: {candidate.notice}</span></li>
                  </ul>
                </Card>
              </Reveal>

              <Reveal delay={40}>
                <Card className="hh-card-body">
                  <div className="hh-card-title-md hh-mb-3">Recruitment action</div>
                  <form onSubmit={handleMove}>
                    <FormSelect
                      label="Move candidate to"
                      options={MOVE_OPTIONS}
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value)}
                    />
                    <Button type="submit" variant="primary" icon="bi-arrow-right" block>
                      Move candidate
                    </Button>
                  </form>
                </Card>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}