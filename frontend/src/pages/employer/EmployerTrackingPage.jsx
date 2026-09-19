import { useState } from 'react'
import { Link } from 'react-router-dom'
import { applicants } from '../../data/applicants'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Button from '../../components/ui/Button'

const STAGES = [
  { key: 'applied', label: 'Applied', icon: 'bi-inbox', tone: 'secondary' },
  { key: 'review', label: 'Under Review', icon: 'bi-eye', tone: 'info' },
  { key: 'shortlisted', label: 'Shortlisted', icon: 'bi-star', tone: 'primary' },
  { key: 'interview', label: 'Interview', icon: 'bi-camera-video', tone: 'warning' },
  { key: 'offer', label: 'Offer', icon: 'bi-envelope-check', tone: 'success' },
  { key: 'hired', label: 'Hired', icon: 'bi-award', tone: 'info' },
]

const INITIAL_BOARD = {
  applied: ['ap2', 'ap4', 'ap7'],
  review: ['ap1'],
  shortlisted: ['ap8'],
  interview: ['ap3', 'ap9'],
  offer: ['ap6'],
  hired: ['ap5', 'ap10'],
}

const applicantById = (id) => applicants.find((a) => a.id === id)

export default function EmployerTrackingPage() {
  const [board, setBoard] = useState(INITIAL_BOARD)

  const move = (id, from, to) => {
    if (!to || !board[to]) return
    setBoard((prev) => ({
      ...prev,
      [from]: prev[from].filter((c) => c !== id),
      [to]: [...prev[to], id],
    }))
  }

  const stageIndex = (key) => STAGES.findIndex((s) => s.key === key)

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <div className="hh-toolbar hh-toolbar-between hh-mb-4">
              <SectionHeading
                eyebrow="EMPLOYER"
                title="Applicant Tracking"
                subtitle="Move candidates through your hiring pipeline."
              />
              <Link to="/employer/applicants">
                <Button variant="outline-primary" icon="bi-people">All applicants</Button>
              </Link>
            </div>
          </Reveal>

          <Reveal>
            <div className="hh-kanban" role="list" aria-label="Recruitment pipeline">
              {STAGES.map((stage) => {
                const ids = board[stage.key] || []
                const candidates = ids.map(applicantById).filter(Boolean)
                return (
                  <div className="hh-kanban-col" role="listitem" key={stage.key}>
                    <div className="hh-kanban-col-head">
                      <span className="hh-kanban-col-title">
                        <span className={`hh-note-icon hh-note-icon-${stage.tone}`} aria-hidden="true" style={{ width: 26, height: 26, fontSize: '0.9rem', borderRadius: 8 }}>
                          <i className={`bi ${stage.icon}`} />
                        </span>
                        {stage.label}
                      </span>
                      <span className="hh-kanban-col-count">{ids.length}</span>
                    </div>
                    <div className="hh-kanban-cards">
                      {candidates.length > 0 ? (
                        candidates.map((candidate) => {
                          const index = stageIndex(stage.key)
                          return (
                            <div className="hh-kanban-card" key={candidate.id}>
                              <div className="d-flex align-items-center gap-2">
                                <span className="hh-avatar hh-avatar-sm hh-avatar-soft" aria-hidden="true">
                                  {candidate.name.charAt(0)}
                                </span>
                                <div className="hh-kanban-card-main">
                                  <div className="hh-kanban-card-name">{candidate.name}</div>
                                  <div className="hh-kanban-card-meta">{candidate.role}</div>
                                </div>
                              </div>
                              <div className="hh-kanban-card-foot">
                                <span className="hh-kanban-card-match">{candidate.match}% match</span>
                                <div className="d-flex align-items-center gap-1">
                                  <button
                                    type="button"
                                    className="hh-kanban-move hh-tip-start"
                                    data-tooltip="Move back"
                                    disabled={index === 0}
                                    onClick={() => move(candidate.id, stage.key, STAGES[index - 1]?.key)}
                                    aria-label={`Move ${candidate.name} back`}
                                  >
                                    <i className="bi bi-chevron-left" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="hh-kanban-move hh-tip-end"
                                    data-tooltip="Move forward"
                                    disabled={index === STAGES.length - 1}
                                    onClick={() => move(candidate.id, stage.key, STAGES[index + 1]?.key)}
                                    aria-label={`Move ${candidate.name} forward`}
                                  >
                                    <i className="bi bi-chevron-right" aria-hidden="true" />
                                  </button>
                                  <Link to={`/employer/applicants/${candidate.id}`} className="hh-btn hh-btn-outline-primary hh-btn-sm">
                                    View
                                  </Link>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="hh-kanban-empty">No candidates here yet.</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}