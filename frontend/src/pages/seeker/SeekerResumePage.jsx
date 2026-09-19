import { useState } from 'react'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

const INITIAL_FILES = [
  { id: 'f1', name: 'Sarah_Obi_Resume.pdf', size: '246 KB', updated: 'September 2026' },
  { id: 'f2', name: 'Sarah_Obi_Cover_Letter.pdf', size: '112 KB', updated: 'September 2026' },
]

export default function SeekerResumePage() {
  const [files, setFiles] = useState(INITIAL_FILES)

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files || [])
    const next = selected.map((file, idx) => ({
      id: `uploaded-${Date.now()}-${idx}`,
      name: file.name,
      size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`,
      updated: 'Just now',
    }))
    if (next.length) setFiles((prev) => [...next, ...prev])
    e.target.value = ''
  }

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <div className="hh-toolbar hh-toolbar-between hh-mb-4">
            <SectionHeading
              eyebrow="JOB SEEKER DASHBOARD"
              title="CV / Resume"
              subtitle="Upload, update, and preview the resume employers see."
            />
            <div className="d-flex gap-2">
              <Button variant="outline-primary" icon="bi-download" pill>Download</Button>
              <Button variant="primary" icon="bi-printer" pill>Print</Button>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-12 col-lg-5">
              <Reveal>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-card-title-md hh-mb-4">Upload a new CV</div>
                  <label className="hh-upload-drop" htmlFor="cv-upload">
                    <input
                      id="cv-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      multiple
                      className="d-none"
                      onChange={handleFiles}
                    />
                    <span className="hh-upload-drop-icon" aria-hidden="true">
                      <i className="bi bi-cloud-arrow-up" />
                    </span>
                    <span className="hh-upload-drop-title">Drop your CV here or click to browse</span>
                    <span className="hh-upload-drop-text">PDF, DOC or DOCX · up to 5 MB</span>
                  </label>
                </Card>
              </Reveal>

              <Reveal delay={60}>
                <Card className="hh-card-body">
                  <div className="hh-card-title-md hh-mb-3">Your documents</div>
                  {files.length > 0 ? (
                    files.map((file) => (
                      <div className="hh-file-item" key={file.id}>
                        <span className="hh-file-icon" aria-hidden="true"><i className="bi bi-file-earmark-pdf" /></span>
                        <div className="hh-file-info">
                          <span className="hh-file-name">{file.name}</span>
                          <span className="hh-file-size">{file.size} · {file.updated}</span>
                        </div>
                        <button
                          type="button"
                          className="hh-file-remove hh-tip-end"
                          data-tooltip="Remove file"
                          aria-label={`Remove ${file.name}`}
                          onClick={() => removeFile(file.id)}
                        >
                          <i className="bi bi-x-lg" aria-hidden="true" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="hh-empty">
                      <div className="hh-empty-icon" aria-hidden="true"><i className="bi bi-file-earmark" /></div>
                      <h3 className="hh-empty-title">No documents yet</h3>
                      <p className="hh-empty-text">Upload your CV above to get started.</p>
                    </div>
                  )}
                  <div className="hh-mt-4">
                    <Badge variant="primary" icon="patch-check">CV attached to applications</Badge>
                  </div>
                </Card>
              </Reveal>
            </div>

            <div className="col-12 col-lg-7">
              <Reveal delay={100}>
                <article className="hh-resume-paper">
                  <h2 className="hh-resume-name">Sarah Obi</h2>
                  <p className="hh-resume-headline">Frontend Developer</p>
                  <div className="hh-app-meta hh-mb-3">
                    <span><i className="bi bi-geo-alt hh-me-1" aria-hidden="true" />Lagos, Nigeria</span>
                    <span><i className="bi bi-envelope hh-me-1" aria-hidden="true" />sarah.obi@email.com</span>
                    <span><i className="bi bi-phone hh-me-1" aria-hidden="true" />+234 800 000 0000</span>
                  </div>

                  <div className="hh-resume-block">
                    <h3 className="hh-resume-block-title">Summary</h3>
                    <p className="hh-resume-entry-text">
                      Frontend developer with 5 years of experience building fast, accessible web
                      applications using React and modern tooling. Known for translating complex
                      requirements into clean, maintainable interfaces.
                    </p>
                  </div>

                  <div className="hh-resume-block">
                    <h3 className="hh-resume-block-title">Experience</h3>
                    <div className="hh-resume-entry">
                      <div className="hh-resume-entry-title">Frontend Developer — Paystack</div>
                      <div className="hh-resume-entry-org">2022 – Present · Lagos, Nigeria</div>
                      <p className="hh-resume-entry-text">Built and shipped payment dashboard features used by thousands of businesses.</p>
                    </div>
                    <div className="hh-resume-entry">
                      <div className="hh-resume-entry-title">UI Developer — Andela</div>
                      <div className="hh-resume-entry-org">2020 – 2022 · Remote</div>
                      <p className="hh-resume-entry-text">Delivered responsive interfaces for fintech clients across three continents.</p>
                    </div>
                  </div>

                  <div className="hh-resume-block">
                    <h3 className="hh-resume-block-title">Education</h3>
                    <div className="hh-resume-entry">
                      <div className="hh-resume-entry-title">B.Sc. Computer Science</div>
                      <div className="hh-resume-entry-org">University of Lagos · 2015 – 2019</div>
                    </div>
                  </div>

                  <div className="hh-resume-block">
                    <h3 className="hh-resume-block-title">Skills</h3>
                    <div className="hh-chip-row">
                      {['React', 'JavaScript', 'TypeScript', 'CSS', 'Git', 'Figma', 'SQL'].map((skill) => (
                        <span className="hh-chip" key={skill}>{skill}</span>
                      ))}
                    </div>
                  </div>
                </article>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}