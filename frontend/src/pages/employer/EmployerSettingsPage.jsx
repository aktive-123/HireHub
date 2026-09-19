import { useState } from 'react'
import SectionHeading from '../../components/ui/SectionHeading'
import Reveal from '../../components/ui/Reveal'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import FormSelect from '../../components/ui/FormSelect'
import Alert from '../../components/ui/Alert'

export default function EmployerSettingsPage() {
  const [saved, setSaved] = useState(false)
  const [deactivated, setDeactivated] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    setSaved(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <div className="hh-toolbar hh-toolbar-between hh-mb-4">
            <SectionHeading
              eyebrow="EMPLOYER"
              title="Account settings"
              subtitle="Manage your account, security, and preferences."
            />
          </div>

          <Reveal>
            {saved && (
              <Alert variant="success" dismissible onDismiss={() => setSaved(false)} className="hh-mb-4">
                Your settings have been updated.
              </Alert>
            )}
          </Reveal>

          <form onSubmit={handleSave}>
            <Reveal>
              <Card className="hh-card-body hh-mb-4">
                <div className="hh-card-title-md hh-mb-4">Personal information</div>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <FormInput label="Full name" defaultValue="David Okpara" required />
                  </div>
                  <div className="col-12 col-md-6">
                    <FormInput label="Work email" type="email" defaultValue="david.okpara@company.com" required />
                  </div>
                  <div className="col-12 col-md-6">
                    <FormInput label="Phone number" type="tel" defaultValue="+234 900 000 0000" />
                  </div>
                  <div className="col-12 col-md-6">
                    <FormSelect
                      label="Timezone"
                      defaultValue="WAT"
                      options={[
                        { value: 'WAT', label: 'West Africa Time (UTC+1)' },
                        { value: 'GMT', label: 'Greenwich Mean Time (UTC+0)' },
                        { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
                      ]}
                    />
                  </div>
                </div>
              </Card>
            </Reveal>

            <Reveal delay={40}>
              <Card className="hh-card-body hh-mb-4">
                <div className="hh-card-title-md hh-mb-4">Password & security</div>
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <FormInput label="Current password" type="password" placeholder="Enter current password" />
                  </div>
                  <div className="col-12 col-md-4">
                    <FormInput label="New password" type="password" placeholder="Enter new password" helperText="At least 8 characters." />
                  </div>
                  <div className="col-12 col-md-4">
                    <FormInput label="Confirm new password" type="password" placeholder="Repeat new password" />
                  </div>
                  <div className="col-12">
                    <div className="hh-check">
                      <input id="mfa" type="checkbox" />
                      <label htmlFor="mfa">Enable two-factor authentication</label>
                    </div>
                  </div>
                </div>
              </Card>
            </Reveal>

            <Reveal delay={80}>
              <Card className="hh-card-body hh-mb-4">
                <div className="hh-card-title-md hh-mb-4">Email preferences</div>
                <div className="d-flex flex-column gap-2">
                  <div className="hh-check">
                    <input id="email-apps" type="checkbox" defaultChecked />
                    <label htmlFor="email-apps">New applicant alerts</label>
                  </div>
                  <div className="hh-check">
                    <input id="email-interviews" type="checkbox" defaultChecked />
                    <label htmlFor="email-interviews">Interview reminders and confirmations</label>
                  </div>
                  <div className="hh-check">
                    <input id="email-jobs" type="checkbox" defaultChecked />
                    <label htmlFor="email-jobs">Job posting performance summaries</label>
                  </div>
                </div>
              </Card>
            </Reveal>

            <Reveal delay={120}>
              <Card className="hh-card-body hh-mb-4">
                <div className="hh-card-title-md hh-mb-4">Notification preferences</div>
                <div className="d-flex flex-column gap-2">
                  <div className="hh-check">
                    <input id="push-apps" type="checkbox" defaultChecked />
                    <label htmlFor="push-apps">Push notifications for new applicants</label>
                  </div>
                  <div className="hh-check">
                    <input id="push-interviews" type="checkbox" defaultChecked />
                    <label htmlFor="push-interviews">Interview reminders</label>
                  </div>
                  <div className="hh-check">
                    <input id="push-account" type="checkbox" />
                    <label htmlFor="push-account">Account and security updates</label>
                  </div>
                </div>
              </Card>
            </Reveal>

            <Reveal delay={160}>
              <Card className="hh-card-body hh-mb-4">
                <div className="hh-card-title-md hh-mb-3">Privacy</div>
                <p className="hh-settings-desc hh-mb-3">Control how your company profile is shown to job seekers.</p>
                <div className="d-flex flex-column gap-2">
                  <div className="hh-check">
                    <input id="privacy-public" type="radio" name="privacy" defaultChecked />
                    <label htmlFor="privacy-public">Public — anyone can view your company and job posts</label>
                  </div>
                  <div className="hh-check">
                    <input id="privacy-seekers" type="radio" name="privacy" />
                    <label htmlFor="privacy-seekers">Registered users only — require sign-in to view posts</label>
                  </div>
                  <div className="hh-check">
                    <input id="privacy-hidden" type="radio" name="privacy" />
                    <label htmlFor="privacy-hidden">Hidden — hide your profile until you reopen it</label>
                  </div>
                </div>
              </Card>
            </Reveal>

            <Reveal delay={200}>
              <Card className="hh-card-body hh-mb-4">
                <div className="hh-danger-zone">
                  <h3 className="hh-danger-zone-title">Deactivate account</h3>
                  <p>
                    Deactivating hides your company profile and pauses active job postings.
                    You can reactivate at any time by logging back in.
                  </p>
                  <Button
                    type="button"
                    variant="outline-primary"
                    size="sm"
                    icon={deactivated ? 'bi-check-lg' : 'bi-person-dash'}
                    className="hh-btn-danger-outline"
                    onClick={() => setDeactivated((v) => !v)}
                  >
                    {deactivated ? 'Account deactivated' : 'Deactivate account'}
                  </Button>
                </div>
              </Card>
            </Reveal>

            <Reveal delay={240}>
              <div className="hh-toolbar hh-toolbar-between">
                <p className="hh-result-count">Changes apply after you save.</p>
                <Button type="submit" variant="primary" icon="bi-check-lg" pill>Save changes</Button>
              </div>
            </Reveal>
          </form>
        </div>
      </section>
    </>
  )
}