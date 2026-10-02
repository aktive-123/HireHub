import { useEffect, useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import Reveal from '../../components/ui/Reveal'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { cvApi } from '../../services/api'

export default function SeekerResumePage() {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState('')

  const load = async () => {
    try {
      const meta = await cvApi.meta()
      if (!meta) {
        setFiles([])
        return
      }
      setFiles([
        {
          id: 'cv',
          name: meta.name ?? 'CV',
          size: meta.size != null ? `${Math.round(meta.size / 1024)} KB` : undefined,
          updated: meta.uploaded_at ?? '',
        },
      ])
    } catch {
      setFiles([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleFiles = async (e) => {
    const selected = Array.from(e.target.files || [])
    e.target.value = ''
    if (!selected.length) return
    setUploading(true)
    setNotice('')
    try {
      await cvApi.upload(selected[0])
      await load()
    } catch {
      setNotice('Upload failed. Use a PDF, DOC or DOCX under 5 MB.')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = async () => {
    try {
      await cvApi.remove()
      setFiles([])
    } catch {
      setNotice('Could not remove the file.')
    }
  }

  const download = async () => {
    try {
      await cvApi.download()
    } catch {
      setNotice('Could not download the file.')
    }
  }

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <PageHeader
            eyebrow="JOB SEEKER DASHBOARD"
            title="CV / Resume"
            subtitle="Upload, update, and preview the resume employers see."
            action={
              files.length > 0 ? (
                <Button variant="outline" icon="bi-download" pill onClick={download}>
                  Download
                </Button>
              ) : null
            }
          />

          {notice && (
            <div className="alert alert-warning hh-mb-4" role="alert">
              {notice}
            </div>
          )}

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
                      className="d-none"
                      onChange={handleFiles}
                    />
                    <span className="hh-upload-drop-icon" aria-hidden="true">
                      <i className="bi bi-cloud-arrow-up" />
                    </span>
                    <span className="hh-upload-drop-title">
                      {uploading ? 'Uploading…' : 'Drop your CV here or click to browse'}
                    </span>
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
                          <span className="hh-file-size">{[file.size, file.updated].filter(Boolean).join(' · ')}</span>
                        </div>
                        <button
                          type="button"
                          className="hh-file-remove hh-tip-end"
                          data-tooltip="Remove file"
                          aria-label={`Remove ${file.name}`}
                          onClick={removeFile}
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
                    <Badge variant={files.length > 0 ? 'primary' : 'secondary'} icon="patch-check">
                      {files.length > 0 ? 'CV attached to new applications' : 'Upload a CV to attach to applications'}
                    </Badge>
                  </div>
                </Card>
              </Reveal>
            </div>

            <div className="col-12 col-lg-7">
              <Reveal delay={100}>
                <article className="hh-resume-paper">
                  <h2 className="hh-resume-name">Your CV</h2>
                  <p className="hh-resume-headline">Resume preview</p>
                  <div className="hh-app-meta hh-mb-3">
                    <span><i className="bi bi-geo-alt hh-me-1" aria-hidden="true" />Upload to enable employers to preview</span>
                  </div>
                  <div className="hh-resume-block">
                    <h3 className="hh-resume-block-title">Summary</h3>
                    <p className="hh-resume-entry-text">
                      Your uploaded CV will be attached to new job applications and available to
                      employers you apply to. Keep it up to date for the best results.
                    </p>
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