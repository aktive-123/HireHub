import { useState } from 'react'
import { seekerApi } from '../../services/api'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import FormSelect from '../../components/ui/FormSelect'
import Alert from '../../components/ui/Alert'

export default function SeekerEditProfilePage() {
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)

  const splitList = (value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const get = (name) => form.elements[name]?.value?.trim() ?? ''

    const payload = {
      name: [get('first_name'), get('last_name')].filter(Boolean).join(' '),
      headline: get('headline'),
      location: get('location'),
      phone: get('phone'),
      summary: get('summary'),
      skills: splitList(get('skills')),
      portfolio: [get('portfolio'), get('github'), get('linkedin')].filter(Boolean),
    }

    setSaving(true)
    setNotice(null)
    try {
      await seekerApi.updateProfile(payload)
      setNotice({ type: 'success', message: 'Your profile has been saved successfully.' })
    } catch {
      setNotice({ type: 'danger', message: "We couldn't save your profile. Please try again." })
    } finally {
      setSaving(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <div className="hh-toolbar hh-toolbar-between hh-mb-4">
            <SectionHeading
              eyebrow="JOB SEEKER DASHBOARD"
              title="Edit your profile"
              subtitle="Keep your information up to date so employers can find you."
            />
            <Button to="/seeker/profile" variant="outline-primary" icon="bi-arrow-left" pill>
              Back to profile
            </Button>
          </div>

          <Reveal>
            {notice && (
              <Alert variant={notice.type} dismissible onDismiss={() => setNotice(null)} className="hh-mb-4">
                {notice.message}
              </Alert>
            )}
          </Reveal>

          <form onSubmit={handleSubmit}>
            <Reveal>
              <Card className="hh-card-body hh-mb-4">
                <div className="hh-card-title-md hh-mb-4">Personal information</div>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <FormInput label="First name" name="first_name" defaultValue="Sarah" required />
                  </div>
                  <div className="col-12 col-md-6">
                    <FormInput label="Last name" name="last_name" defaultValue="Obi" required />
                  </div>
                  <div className="col-12 col-md-6">
                    <FormInput label="Professional headline" name="headline" defaultValue="Frontend Developer" icon="bi-asterisk" helperText="A short title that describes your expertise." />
                  </div>
                  <div className="col-12 col-md-6">
                    <FormInput label="Location" name="location" defaultValue="Lagos, Nigeria" icon="bi-geo-alt" />
                  </div>
                  <div className="col-12 col-md-6">
                    <FormInput label="Phone number" type="tel" name="phone" defaultValue="+234 800 000 0000" icon="bi-telephone" />
                  </div>
                  <div className="col-12 col-md-6">
                    <FormSelect
                      label="Open to relocation"
                      defaultValue="yes"
                      options={[
                        { value: 'yes', label: 'Yes' },
                        { value: 'no', label: 'No' },
                        { value: 'remote', label: 'Remote only' },
                      ]}
                    />
                  </div>
                  <div className="col-12">
                    <label htmlFor="about" className="form-label">About me <span className="text-danger">*</span></label>
                    <textarea
                      id="about"
                      name="summary"
                      className="form-control"
                      rows="4"
                      defaultValue="Frontend developer with 5 years of experience building fast, accessible web applications."
                      required
                    />
                    <div className="form-text text-muted">A short summary employers will see first.</div>
                  </div>
                </div>
              </Card>
            </Reveal>

            <Reveal delay={60}>
              <Card className="hh-card-body hh-mb-4">
                <div className="hh-card-title-md hh-mb-4">Skills</div>
                <p className="hh-settings-desc hh-mb-3">Add the skills you're best at — separated by commas.</p>
                <label htmlFor="skills" className="form-label">Skills</label>
                <input
                  id="skills"
                  name="skills"
                  className="form-control"
                  defaultValue="React, JavaScript, TypeScript, CSS, HTML, Git, Figma, SQL"
                />
              </Card>
            </Reveal>

            <Reveal delay={120}>
              <Card className="hh-card-body hh-mb-4">
                <div className="hh-card-title-md hh-mb-4">Social links</div>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <FormInput label="LinkedIn" name="linkedin" placeholder="https://linkedin.com/in/you" icon="bi-linkedin" />
                  </div>
                  <div className="col-12 col-md-6">
                    <FormInput label="Portfolio / website" name="portfolio" placeholder="https://yourwebsite.com" icon="bi-globe2" />
                  </div>
                  <div className="col-12 col-md-6">
                    <FormInput label="GitHub" name="github" placeholder="https://github.com/you" icon="bi-github" />
                  </div>
                  <div className="col-12 col-md-6">
                    <FormInput label="Twitter / X" placeholder="https://x.com/you" icon="bi-twitter-x" />
                  </div>
                </div>
              </Card>
            </Reveal>

            <Reveal delay={180}>
              <div className="hh-toolbar hh-toolbar-between hh-mb-4">
                <Button to="/seeker/profile" variant="ghost" icon="bi-x-lg">Cancel</Button>
                <div className="d-flex gap-2">
                  <Button type="button" variant="outline-primary" icon="bi-eye">Preview profile</Button>
                  <Button type="submit" variant="primary" icon="bi-check-lg" disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </div>
            </Reveal>
          </form>
        </div>
      </section>
    </>
  )
}