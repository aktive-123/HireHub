import { useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import Reveal from '../../components/ui/Reveal'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import FormSelect from '../../components/ui/FormSelect'
import Alert from '../../components/ui/Alert'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import SessionSecurityCard from '../../components/common/SessionSecurityCard'
import ProfilePhotoCard from '../../components/common/ProfilePhotoCard'
import { authApi } from '../../services/api'
import { useAccountSettings } from '../../hooks/useAccountSettings'
import { DIAL_CODE, PHONE_PLACEHOLDER } from '../../constants/nigeria'

// Only IANA identifiers are offered. The settings endpoint validates against
// PHP's timezone_identifiers_list(), so the previous 'WAT' and 'GMT' options
// were rejected with a 422 the moment a user saved them. Africa/Lagos is UTC+1
// all year because Nigeria does not observe daylight saving.
const TIMEZONES = [
  { value: 'Africa/Lagos', label: 'Lagos (WAT, UTC+1)' },
  { value: 'Africa/Accra', label: 'Accra (GMT, UTC+0)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT, UTC+3)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC+0)' },
]

const EMAIL_PREFS = [
  { key: 'jobs', label: 'Recommended jobs and matches', defaultOn: true },
  { key: 'apps', label: 'Application and interview updates', defaultOn: true },
  { key: 'career', label: 'Career resources and tips', defaultOn: false },
]

const PUSH_PREFS = [
  { key: 'apps', label: 'Push notifications for application updates', defaultOn: true },
  { key: 'interviews', label: 'Interview reminders', defaultOn: true },
  { key: 'saved', label: 'Saved job alerts', defaultOn: false },
]

const PRIVACY_CHOICES = [
  { value: 'public', label: 'Public — anyone can find and view your profile' },
  { value: 'recruiters', label: 'Recruiters only — only employers can view your profile' },
  { value: 'hidden', label: 'Hidden — your profile is invisible to everyone' },
]

export default function SeekerSettingsPage() {
  const {
    settings,
    loading,
    saving,
    error,
    message,
    dirty,
    update,
    setPreference,
    reset,
    save,
    clearMessage,
  } = useAccountSettings()

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordDone, setPasswordDone] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState(false)

  const privacy = settings.privacy_preferences?.profile ?? 'public'

  const handleSave = async (event) => {
    event.preventDefault()
    await save()
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    setPasswordError(null)
    setPasswordDone(false)
    if (passwords.next !== passwords.confirm) {
      setPasswordError('The new password and its confirmation do not match.')
      return
    }
    setPasswordBusy(true)
    try {
      await authApi.changePassword({
        current_password: passwords.current,
        password: passwords.next,
        password_confirmation: passwords.confirm,
      })
      setPasswords({ current: '', next: '', confirm: '' })
      setPasswordDone(true)
    } catch (err) {
      setPasswordError(err?.message || 'Could not update your password.')
    } finally {
      setPasswordBusy(false)
    }
  }

  const handleDeactivate = async () => {
    setDeactivating(true)
    setDeactivateError(null)
    try {
      await authApi.deactivateAccount()
      setConfirmDeactivate(false)
      // Every session was revoked server-side, so the local token is now dead
      // and must not be left behind.
      authApi.logout().catch(() => {})
      window.location.assign('/login')
    } catch (err) {
      setDeactivateError(err?.message || 'Could not deactivate your account.')
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <>
      <section className="hh-section-space bg-white">
        <div className="page-container">
          <PageHeader
            eyebrow="JOB SEEKER DASHBOARD"
            title="Account settings"
            subtitle="Manage your personal information, security, and preferences."
          />

          <ProfilePhotoCard />

          <Reveal>
            {message ? (
              <Alert
                variant="success"
                dismissible
                onDismiss={clearMessage}
                className="hh-mb-4"
              >
                {message}
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="danger" className="hh-mb-4">
                {error.message}
              </Alert>
            ) : null}
          </Reveal>

          {loading ? (
            <p className="text-muted">Loading your settings…</p>
          ) : (
            <form id="settings-form" onSubmit={handleSave}>
              <Reveal>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-card-title-md hh-mb-4">Personal information</div>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <FormInput
                        label="Full name"
                        value={settings.name}
                        onChange={(e) => update({ name: e.target.value })}
                        disabled={saving}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <FormInput
                        label="Email address"
                        type="email"
                        value={settings.email ?? '—'}
                        readOnly
                        helperText="Contact support to change the address on your account."
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <FormInput
                        label="Phone number"
                        type="tel"
                        placeholder={PHONE_PLACEHOLDER}
                        helperText={`Nigerian number, starting with ${DIAL_CODE}`}
                        value={settings.phone ?? ''}
                        onChange={(e) => update({ phone: e.target.value })}
                        disabled={saving}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <FormSelect
                        label="Timezone"
                        value={settings.timezone}
                        onChange={(e) => update({ timezone: e.target.value })}
                        options={TIMEZONES}
                        disabled={saving}
                        placeholder={null}
                      />
                    </div>
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={40}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-card-title-md hh-mb-4">Two-factor authentication</div>
                  <div className="hh-check">
                    <input
                      id="mfa"
                      type="checkbox"
                      checked={settings.two_factor_enabled}
                      onChange={(e) => update({ two_factor_enabled: e.target.checked })}
                      disabled={saving}
                    />
                    <label htmlFor="mfa">
                      Record my preference for two-factor authentication{' '}
                      <span className="text-muted small">
                        (your intent is saved; enrolling a real second factor is not wired up yet)
                      </span>
                    </label>
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={80}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-card-title-md hh-mb-4">Email preferences</div>
                  <div className="d-flex flex-column gap-2">
                    {EMAIL_PREFS.map((pref) => (
                      <div className="hh-check" key={pref.key}>
                        <input
                          id={`email-${pref.key}`}
                          type="checkbox"
                          checked={settings.email_preferences?.[pref.key] ?? pref.defaultOn}
                          onChange={(e) =>
                            setPreference('email_preferences', pref.key, e.target.checked)
                          }
                          disabled={saving}
                        />
                        <label htmlFor={`email-${pref.key}`}>{pref.label}</label>
                      </div>
                    ))}
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={120}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-card-title-md hh-mb-4">Notification preferences</div>
                  <div className="d-flex flex-column gap-2">
                    {PUSH_PREFS.map((pref) => (
                      <div className="hh-check" key={pref.key}>
                        <input
                          id={`push-${pref.key}`}
                          type="checkbox"
                          checked={settings.notification_preferences?.[pref.key] ?? pref.defaultOn}
                          onChange={(e) =>
                            setPreference('notification_preferences', pref.key, e.target.checked)
                          }
                          disabled={saving}
                        />
                        <label htmlFor={`push-${pref.key}`}>{pref.label}</label>
                      </div>
                    ))}
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={160}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-card-title-md hh-mb-3">Privacy</div>
                  <p className="hh-settings-desc hh-mb-3">Control how recruiters discover your profile.</p>
                  <div className="d-flex flex-column gap-2">
                    {PRIVACY_CHOICES.map((choice) => (
                      <div className="hh-check" key={choice.value}>
                        <input
                          id={`privacy-${choice.value}`}
                          type="radio"
                          name="privacy"
                          checked={privacy === choice.value}
                          onChange={() => setPreference('privacy_preferences', 'profile', choice.value)}
                          disabled={saving}
                        />
                        <label htmlFor={`privacy-${choice.value}`}>{choice.label}</label>
                      </div>
                    ))}
                  </div>
                </Card>
              </Reveal>
            </form>
          )}

          {!loading && (
            <>
              {/* Separate form: nesting a <form> inside the settings form is
                  invalid HTML and browsers drop one of the two submit
                  handlers. */}
              <Reveal delay={180}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-card-title-md hh-mb-4">Change password</div>
                  <form onSubmit={handleChangePassword}>
                    <div className="row g-3">
                      <div className="col-12 col-md-4">
                        <FormInput
                          label="Current password"
                          type="password"
                          value={passwords.current}
                          onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                          disabled={passwordBusy}
                          required
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <FormInput
                          label="New password"
                          type="password"
                          value={passwords.next}
                          onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                          disabled={passwordBusy}
                          helperText="At least 8 characters."
                          required
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <FormInput
                          label="Confirm new password"
                          type="password"
                          value={passwords.confirm}
                          onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                          disabled={passwordBusy}
                          required
                        />
                      </div>
                    </div>
                    {passwordError ? (
                      <Alert variant="danger" className="mb-3">
                        {passwordError}
                      </Alert>
                    ) : null}
                    {passwordDone ? (
                      <Alert variant="success" className="mb-3">
                        Password updated. Other devices have been signed out.
                      </Alert>
                    ) : null}
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      icon="bi-shield-lock"
                      disabled={passwordBusy || !passwords.current || !passwords.next}
                    >
                      {passwordBusy ? 'Updating…' : 'Update password'}
                    </Button>
                  </form>
                </Card>
              </Reveal>

              <Reveal delay={200}>
                <Card className="hh-card-body hh-mb-4">
                  <div className="hh-danger-zone">
                    <h3 className="hh-danger-zone-title">Deactivate account</h3>
                    <p>
                      Deactivating hides your profile and applications from employers and signs you
                      out of every device. You can sign back in to reactivate.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon="bi-person-dash"
                      className="hh-btn-danger-outline"
                      onClick={() => setConfirmDeactivate(true)}
                    >
                      Deactivate account
                    </Button>
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={220}>
                <SessionSecurityCard />
              </Reveal>

              <Reveal delay={240}>
                <div className="hh-toolbar hh-toolbar-between">
                  <p className="hh-result-count">
                    {dirty ? 'You have unsaved changes.' : 'Changes apply after you save.'}
                  </p>
                  <div className="d-flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={reset}
                      disabled={saving || !dirty}
                    >
                      Discard
                    </Button>
                    <Button
                      type="submit"
                      form="settings-form"
                      variant="primary"
                      icon="bi-check-lg"
                      pill
                      disabled={saving || !dirty}
                    >
                      {saving ? 'Saving…' : 'Save changes'}
                    </Button>
                  </div>
                </div>
              </Reveal>
            </>
          )}

          <ConfirmDialog
            isOpen={confirmDeactivate}
            title="Deactivate your account"
            message="Your profile and applications will be hidden from employers, and you will be signed out of every device. You can sign back in to reactivate."
            confirmLabel="Deactivate"
            busy={deactivating}
            error={deactivateError}
            onCancel={() => setConfirmDeactivate(false)}
            onConfirm={handleDeactivate}
          />
        </div>
      </section>
    </>
  )
}
