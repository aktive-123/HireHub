import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { employerApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import PageHeader from '../../components/ui/PageHeader'
import Reveal from '../../components/ui/Reveal'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import FormSelect from '../../components/ui/FormSelect'
import Alert from '../../components/ui/Alert'
import EmptyState from '../../components/ui/EmptyState'
import LoadingState from '../../components/ui/LoadingState'
import { publicJobCategories } from '../../data/jobs'

const INDUSTRY_OPTIONS = publicJobCategories.map((c) => c.name)
const SIZE_OPTIONS = [
  '1–100 Employees',
  '101–500 Employees',
  '501–1,000 Employees',
  '1,001–5,000 Employees',
  '5,001–10,000 Employees',
  '10,000+ Employees',
]

export default function EmployerEditCompanyPage() {
  const { data: company, loading, error, reload } = useApiData(() => employerApi.company(), [])

  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [values, setValues] = useState(() => ({
    name: '',
    industry: '',
    size: '',
    location: '',
    website: '',
    tagline: '',
    about: '',
    culture: 'We move fast, take ownership and support each other. Time zones and flexible work are respected across our team.',
    benefits: [
      'Competitive salary and equity',
      'Health, dental and vision coverage',
      'Annual learning and conference budget',
      'Hybrid work options and flexible hours',
    ].join('\n'),
  }))

  useEffect(() => {
    if (company) {
      setValues((prev) => ({
        ...prev,
        name: company.name ?? '',
        industry: company.industry ?? '',
        size: company.size ?? '',
        location: company.location ?? '',
        website: company.website ?? '',
        tagline: company.tagline ?? '',
        about: company.description ?? '',
      }))
    }
  }, [company])

  const set = (key, value) => setValues((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaveError(false)
    try {
      await employerApi.updateCompany({
        name: values.name,
        industry: values.industry,
        location: values.location,
        size: values.size,
        founded: company?.founded,
        website: values.website,
        tagline: values.tagline,
        description: values.about,
      })
      setSaved(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setSaveError(true)
    }
  }

  if (loading) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Reveal>
            <LoadingState text="Loading company profile…" />
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
              title="Couldn't load your company profile"
              text="Something went wrong while fetching your company. Please try again."
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

  if (!company) {
    return <div className="page-container hh-section-space"><EmptyState icon="building" title="No company profile" text="Create your company profile to get started." /></div>
  }

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <PageHeader
            eyebrow="EMPLOYER"
            title="Edit company profile"
            subtitle="Update how your company appears to candidates."
            action={
              <Link to="/employer/company">
                <Button variant="outline-primary" icon="bi-eye">Preview profile</Button>
              </Link>
            }
          />

          <Reveal>
            {saved && (
              <Alert variant="success" dismissible onDismiss={() => setSaved(false)} className="hh-mb-4">
                Your company profile has been updated.
              </Alert>
            )}
            {saveError && (
              <Alert variant="danger" dismissible onDismiss={() => setSaveError(false)} className="hh-mb-4">
                Couldn't save your company profile. Please try again.
              </Alert>
            )}
          </Reveal>

          <form onSubmit={handleSubmit}>
            <Reveal>
              <Card className="hh-card-body hh-mb-4">
                <div className="hh-card-title-md hh-mb-4">Company branding</div>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label" htmlFor="company-logo">Company logo</label>
                    <label className="hh-upload-drop" htmlFor="company-logo">
                      <input id="company-logo" type="file" accept="image/*" className="d-none" />
                      <span className="hh-upload-drop-icon" aria-hidden="true">
                        <i className="bi bi-image" />
                      </span>
                      <span className="hh-upload-drop-title">Click to upload a logo</span>
                      <span className="hh-upload-drop-text">PNG or SVG, at least 200×200 px.</span>
                    </label>
                  </div>
                </div>
              </Card>
            </Reveal>

            <Reveal delay={40}>
              <Card className="hh-card-body hh-mb-4">
                <div className="hh-card-title-md hh-mb-4">Company information</div>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <FormInput label="Company name" value={values.name} onChange={(e) => set('name', e.target.value)} required />
                  </div>
                  <div className="col-12 col-md-6">
                    <FormSelect
                      label="Industry"
                      options={INDUSTRY_OPTIONS}
                      value={values.industry}
                      onChange={(e) => set('industry', e.target.value)}
                      placeholder="Select industry"
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <FormSelect
                      label="Company size"
                      options={SIZE_OPTIONS}
                      value={values.size}
                      onChange={(e) => set('size', e.target.value)}
                      placeholder="Select company size"
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <FormInput label="Location" value={values.location} onChange={(e) => set('location', e.target.value)} required />
                  </div>
                  <div className="col-12 col-md-6">
                    <FormInput label="Website" type="url" value={values.website} onChange={(e) => set('website', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <FormInput label="Tagline" helperText="A one-line description shown next to your logo." value={values.tagline} onChange={(e) => set('tagline', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="company-about">About</label>
                    <textarea id="company-about" className="form-control" rows={5} value={values.about} onChange={(e) => set('about', e.target.value)} />
                  </div>
                </div>
              </Card>
            </Reveal>

            <Reveal delay={80}>
              <Card className="hh-card-body hh-mb-4">
                <div className="hh-card-title-md hh-mb-4">Culture & benefits</div>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="company-culture">Culture</label>
                    <textarea id="company-culture" className="form-control" rows={4} value={values.culture} onChange={(e) => set('culture', e.target.value)} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label" htmlFor="company-benefits">
                      Benefits <span className="text-muted hh-small">(one per line)</span>
                    </label>
                    <textarea id="company-benefits" className="form-control" rows={4} value={values.benefits} onChange={(e) => set('benefits', e.target.value)} />
                  </div>
                </div>
              </Card>
            </Reveal>

            <Reveal delay={120}>
              <div className="hh-toolbar hh-toolbar-between flex-wrap">
                <p className="hh-result-count hh-mb-0">Changes appear on your public profile instantly.</p>
                <Button type="submit" variant="primary" icon="bi-check-lg" pill>
                  Save changes
                </Button>
              </div>
            </Reveal>
          </form>
        </div>
      </section>
    </>
  )
}