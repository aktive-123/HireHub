import { useState } from 'react'
import { seekerApi } from '../../services/api'
import { useApiData } from '../../hooks/useApiData'
import PageHeader from '../../components/ui/PageHeader'
import Reveal from '../../components/ui/Reveal'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import FormSelect from '../../components/ui/FormSelect'
import LoadingState from '../../components/ui/LoadingState'
import Alert from '../../components/ui/Alert'
import ProfilePhotoCard from '../../components/common/ProfilePhotoCard'
import { DIAL_CODE, NIGERIAN_STATES, PHONE_PLACEHOLDER } from '../../constants/nigeria'

// The form is seeded from the API rather than hard-coded sample values, so a
// candidate always edits their own record. These are the only fields the
// profile endpoint accepts (see SeekerController::updateProfile).
const BLANK = {
  first_name: '',
  last_name: '',
  headline: '',
  location: '',
  phone: '',
  address_line: '',
  city: '',
  state: '',
  years_experience: '',
  notice_period: '',
  summary: '',
  skills: '',
  links: '',
}

export default function SeekerEditProfilePage() {
  const { data: profile, loading, error } = useApiData(() => seekerApi.profile(), [])
  const [form, setForm] = useState(null)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)

  // Seeded once, from the fetched record. A "saved" snapshot lets the Preview
  // button tell the user whether what they are looking at includes their edits.
  const [saved, setSaved] = useState(null)

  const seed = (data) => {
    const name = data?.name ?? ''
    const [first = '', ...rest] = name.trim().split(/\s+/)
    return {
      first_name: first,
      last_name: rest.join(' '),
      headline: data?.headline ?? '',
      location: data?.location ?? '',
      phone: data?.phone ?? '',
      address_line: data?.address_line ?? '',
      city: data?.city ?? '',
      state: data?.state ?? '',
      years_experience: data?.years_experience ?? '',
      notice_period: data?.notice_period ?? '',
      summary: data?.summary ?? '',
      skills: (data?.skills ?? []).join(', '),
      links: (data?.portfolio ?? []).join('\n'),
    }
  }

  // `form` is null until the first load resolves, which is what keeps the
  // inputs from flashing the blank state before the real data arrives.
  const values = form ?? (profile ? seed(profile) : BLANK)
  const setField = (field) => (event) =>
    setForm({ ...values, [field]: event.target.value })

  const isDirty = saved !== null && JSON.stringify(values) !== JSON.stringify(saved)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNotice(null)

    const splitList = (value, separator) =>
      value
        .split(separator)
        .map((item) => item.trim())
        .filter(Boolean)

    const payload = {
      name: [values.first_name, values.last_name].filter(Boolean).join(' '),
      headline: values.headline,
      location: values.location,
      phone: values.phone,
      address_line: values.address_line,
      city: values.city,
      state: values.state,
      years_experience: values.years_experience,
      notice_period: values.notice_period,
      summary: values.summary,
      skills: splitList(values.skills, ','),
      portfolio: splitList(values.links, '\n'),
    }

    try {
      const res = await seekerApi.updateProfile(payload)
      const next = { ...values }
      setSaved(next)
      setForm(next)
      setNotice({
        type: 'success',
        message: res?.message || 'Your profile has been saved successfully.',
      })
    } catch (err) {
      setNotice({
        type: 'danger',
        // Surface the validation detail (e.g. which field was too long)
        // rather than a blanket failure message.
        message: err?.message || "We couldn't save your profile. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <LoadingState text="Loading your profile…" />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <Alert variant="danger">Could not load your profile: {error.message}</Alert>
        </div>
      </section>
    )
  }

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <PageHeader
          eyebrow="JOB SEEKER DASHBOARD"
          title="Edit your profile"
          subtitle="Keep your information up to date so employers can find you."
          action={
            <Button to="/seeker/profile" variant="outline" icon="bi-arrow-left" pill>
              Back to profile
            </Button>
          }
        />

        {notice ? (
          <Alert
            variant={notice.type}
            dismissible
            onDismiss={() => setNotice(null)}
            className="hh-mb-4"
          >
            {notice.message}
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit}>
          <Reveal>
            <Card className="hh-card-body hh-mb-4">
              <div className="hh-card-title-md hh-mb-4">Personal information</div>
              <div className="hh-mb-4">
                <ProfilePhotoCard embedded />
              </div>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <FormInput
                    label="First name"
                    name="first_name"
                    value={values.first_name}
                    onChange={setField('first_name')}
                    disabled={saving}
                    required
                  />
                </div>
                <div className="col-12 col-md-6">
                  <FormInput
                    label="Last name"
                    name="last_name"
                    value={values.last_name}
                    onChange={setField('last_name')}
                    disabled={saving}
                    required
                  />
                </div>
                <div className="col-12 col-md-6">
                  <FormInput
                    label="Professional headline"
                    name="headline"
                    value={values.headline}
                    onChange={setField('headline')}
                    disabled={saving}
                    helperText="A short title that describes your expertise."
                  />
                </div>
                <div className="col-12 col-md-6">
                  <FormInput
                    label="Location"
                    name="location"
                    value={values.location}
                    onChange={setField('location')}
                    disabled={saving}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <FormInput
                    label="Phone number"
                    type="tel"
                    name="phone"
                    placeholder={PHONE_PLACEHOLDER}
                    helperText={`Nigerian number, starting with ${DIAL_CODE}`}
                    value={values.phone}
                    onChange={setField('phone')}
                    disabled={saving}
                  />
                </div>
                <div className="col-12">
                  <FormInput
                    label="Street address"
                    name="address_line"
                    placeholder="12 Admiralty Way, Lekki Phase 1"
                    helperText="Only shared with employers you apply to."
                    value={values.address_line}
                    onChange={setField('address_line')}
                    disabled={saving}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <FormInput
                    label="City"
                    name="city"
                    placeholder="Lagos"
                    value={values.city}
                    onChange={setField('city')}
                    disabled={saving}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <FormSelect
                    label="State"
                    name="state"
                    options={NIGERIAN_STATES}
                    placeholder="Select state"
                    value={values.state}
                    onChange={setField('state')}
                    disabled={saving}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <FormInput
                    label="Years of experience"
                    name="years_experience"
                    value={values.years_experience}
                    onChange={setField('years_experience')}
                    disabled={saving}
                    placeholder="e.g. 5 years"
                  />
                </div>
                <div className="col-12 col-md-6">
                  <FormInput
                    label="Notice period"
                    name="notice_period"
                    value={values.notice_period}
                    onChange={setField('notice_period')}
                    disabled={saving}
                    placeholder="e.g. Immediate"
                  />
                </div>
                <div className="col-12">
                  <label htmlFor="about" className="form-label">
                    About me <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="about"
                    name="summary"
                    className="form-control"
                    rows={4}
                    value={values.summary}
                    onChange={setField('summary')}
                    disabled={saving}
                    required
                  />
                  <div className="form-text text-muted">
                    A short summary employers will see first.
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={60}>
            <Card className="hh-card-body hh-mb-4">
              <div className="hh-card-title-md hh-mb-4">Skills</div>
              <p className="hh-settings-desc hh-mb-3">
                Add the skills you're best at — separated by commas.
              </p>
              <FormInput
                label="Skills"
                name="skills"
                value={values.skills}
                onChange={setField('skills')}
                disabled={saving}
                placeholder="React, TypeScript, CSS"
              />
            </Card>
          </Reveal>

          <Reveal delay={120}>
            <Card className="hh-card-body hh-mb-4">
              <div className="hh-card-title-md hh-mb-4">Links</div>
              <label htmlFor="links" className="form-label">
                Portfolio, GitHub, LinkedIn
              </label>
              <textarea
                id="links"
                name="links"
                className="form-control"
                rows={4}
                value={values.links}
                onChange={setField('links')}
                disabled={saving}
                placeholder={'https://linkedin.com/in/you\nhttps://github.com/you'}
              />
              <div className="form-text text-muted">One link per line.</div>
            </Card>
          </Reveal>

          <Reveal delay={180}>
            <div className="hh-toolbar hh-toolbar-between hh-mb-4">
              <Button to="/seeker/profile" variant="ghost" icon="bi-x-lg">
                Cancel
              </Button>
              <div className="d-flex gap-2">
                {/*
                  Opens the saved profile in a new tab so the form and any
                  unsaved edits are kept. Rendered as an anchor (Button's href
                  branch) rather than a nested button inside a Link.
                */}
                <Button
                  href="/seeker/profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  icon="bi-eye"
                >
                  {isDirty ? 'Preview saved profile' : 'Preview profile'}
                </Button>
                <Button type="submit" variant="primary" icon="bi-check-lg" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
            {isDirty ? (
              <p className="text-muted small hh-mb-0">
                You have unsaved changes. The preview opens a separate tab showing
                your saved profile.
              </p>
            ) : null}
          </Reveal>
        </form>
      </div>
    </section>
  )
}
