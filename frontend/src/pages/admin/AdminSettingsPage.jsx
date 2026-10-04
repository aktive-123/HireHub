import { useState, useEffect } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import FormSelect from '../../components/ui/FormSelect'
import HiringFeeRatesSection from '../../components/admin/HiringFeeRatesSection'
import ProfilePhotoCard from '../../components/common/ProfilePhotoCard'
import { adminApi } from '../../services/api'
import { useAdminData } from '../../hooks/useAdminData'

function Toggle({ label, desc, checked, disabled, onChange }) {
  return (
    <div className="hh-setting-row">
      <div>
        <div className="hh-setting-title">{label}</div>
        {desc && <p className="hh-setting-desc">{desc}</p>}
      </div>
      <label className="hh-switch">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
        />
        <span className="hh-switch-slider" aria-hidden="true" />
      </label>
    </div>
  )
}

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false)
  const [moderation, setModeration] = useState({
    autoApprove: false,
    flagPosts: true,
    verifyCompanies: true,
    requireEmail: true,
  })
  const [features, setFeatures] = useState({
    featuredJobs: true,
    salaryTransparency: true,
    resumeParsing: false,
    groupHiring: false,
    matching: true,
  })
  const [maintenance, setMaintenance] = useState(false)
  const [values, setValues] = useState({
    siteName: 'HireHub',
    supportEmail: 'support@hirehub.com',
    currency: 'NGN',
    defaultLocation: 'Lagos, Nigeria',
    jobDuration: '30',
  })

  const settings = useAdminData(() => adminApi.settings(), {})

  useEffect(() => {
    if (!settings || Object.keys(settings).length === 0) return
    const general = settings.general ?? {}
    const moderation = settings.moderation ?? {}
    const features = settings.features ?? {}
    const maintenanceSettings = settings.maintenance ?? {}

    setValues((prev) => ({
      ...prev,
      siteName: general.site_name ?? prev.siteName,
      supportEmail: general.support_email ?? prev.supportEmail,
      currency: general.currency ?? prev.currency,
      defaultLocation: general.default_location ?? prev.defaultLocation,
      jobDuration: String(general.job_duration ?? prev.jobDuration),
    }))
    setModeration((prev) => ({
      ...prev,
      autoApprove: moderation.auto_approve_jobs ?? prev.autoApprove,
      flagPosts: moderation.flag_suspicious_posts ?? prev.flagPosts,
      verifyCompanies: moderation.review_companies ?? prev.verifyCompanies,
      requireEmail: moderation.require_email_verification ?? prev.requireEmail,
    }))
    setFeatures((prev) => ({
      ...prev,
      featuredJobs: features.featured_jobs ?? prev.featuredJobs,
      salaryTransparency: features.salary_transparency ?? prev.salaryTransparency,
      resumeParsing: features.resume_parsing ?? prev.resumeParsing,
      groupHiring: features.group_hiring ?? prev.groupHiring,
      matching: features.candidate_matching ?? prev.matching,
    }))
    setMaintenance(Boolean(
      general.maintenance_mode ??
        maintenanceSettings.maintenance_mode ??
        maintenanceSettings.enabled ??
        false
    ))
  }, [settings])

  const setValue = (key) => (event) =>
    setValues((prev) => ({ ...prev, [key]: event.target.value }))

  const setModerationValue = (key) => (value) =>
    setModeration((prev) => ({ ...prev, [key]: value }))

  const setFeatureValue = (key) => (value) =>
    setFeatures((prev) => ({ ...prev, [key]: value }))

  const handleSave = () => {
    adminApi
      .updateSettings({
        general: {
          site_name: values.siteName,
          support_email: values.supportEmail,
          currency: values.currency,
          default_location: values.defaultLocation,
          job_duration: values.jobDuration,
        },
        moderation: {
          auto_approve_jobs: moderation.autoApprove,
          flag_suspicious_posts: moderation.flagPosts,
          review_companies: moderation.verifyCompanies,
          require_email_verification: moderation.requireEmail,
        },
        features: {
          featured_jobs: features.featuredJobs,
          salary_transparency: features.salaryTransparency,
          resume_parsing: features.resumeParsing,
          group_hiring: features.groupHiring,
          candidate_matching: features.matching,
        },
        maintenance: { maintenance_mode: maintenance },
      })
      .then(() => {
        setSaved(true)
        window.setTimeout(() => setSaved(false), 2500)
      })
      .catch(() => {})
  }

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container hh-page-container-narrow">
        <AdminPageHeader
          eyebrow="ADMIN CONSOLE"
          title="Platform Settings"
          subtitle="Configure site-wide defaults, moderation rules and available features."
          action={
            <div className="d-flex align-items-center gap-2">
              {saved && <Badge variant="success" icon="check2">Saved</Badge>}
              <Button variant="primary" icon="bi-check2" onClick={handleSave}>
                Save settings
              </Button>
            </div>
          }
        />

        <ProfilePhotoCard />

        <Card className="hh-card-body hh-mb-4">
          <h3 className="hh-card-title-md hh-mb-3">General</h3>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <FormInput
                label="Site name"
                value={values.siteName}
                onChange={setValue('siteName')}
              />
            </div>
            <div className="col-12 col-md-6">
              <FormInput
                label="Support email"
                type="email"
                value={values.supportEmail}
                onChange={setValue('supportEmail')}
              />
            </div>
            <div className="col-12 col-sm-6 col-md-4">
              <FormSelect
                label="Default currency"
                value={values.currency}
                onChange={setValue('currency')}
                placeholder={null}
                options={[
                  { value: 'NGN', label: 'Nigerian Naira (₦)' },
                  { value: 'USD', label: 'US Dollar ($)' },
                  { value: 'EUR', label: 'Euro (€)' },
                  { value: 'GBP', label: 'British Pound (£)' },
                ]}
              />
            </div>
            <div className="col-12 col-sm-6 col-md-4">
              <FormInput
                label="Default location"
                value={values.defaultLocation}
                onChange={setValue('defaultLocation')}
              />
            </div>
            <div className="col-12 col-sm-6 col-md-4">
              <FormSelect
                label="Job listing duration (days)"
                value={values.jobDuration}
                onChange={setValue('jobDuration')}
                placeholder={null}
                options={[
                  { value: '15', label: '15 days' },
                  { value: '30', label: '30 days' },
                  { value: '45', label: '45 days' },
                  { value: '60', label: '60 days' },
                ]}
              />
            </div>
          </div>
        </Card>

        <Card className="hh-card-body hh-mb-4">
          <h3 className="hh-card-title-md hh-mb-2">Moderation &amp; Compliance</h3>
          <p className="text-muted small hh-mb-2">
            Control how jobs, companies and accounts are reviewed on the platform.
          </p>
          <Toggle
            label="Auto-approve published jobs"
            desc="Skip the moderation queue for verified employers."
            checked={moderation.autoApprove}
            onChange={setModerationValue('autoApprove')}
          />
          <Toggle
            label="Flag suspicious job posts"
            desc="Alert admins about posts that look like scams or spam."
            checked={moderation.flagPosts}
            onChange={setModerationValue('flagPosts')}
          />
          <Toggle
            label="Review companies before listing"
            desc="New company profiles require admin approval."
            checked={moderation.verifyCompanies}
            onChange={setModerationValue('verifyCompanies')}
          />
          <Toggle
            label="Require email verification"
            desc="Accounts must confirm their email before going live."
            checked={moderation.requireEmail}
            onChange={setModerationValue('requireEmail')}
          />
        </Card>

        <Card className="hh-card-body hh-mb-4">
          <h3 className="hh-card-title-md hh-mb-2">Features</h3>
          <p className="text-muted small hh-mb-2">
            Enable or disable product features across the platform.
          </p>
          <Toggle
            label="Featured jobs"
            desc="Let employers boost listings to the top of results."
            checked={features.featuredJobs}
            onChange={setFeatureValue('featuredJobs')}
          />
          <Toggle
            label="Salary transparency"
            desc="Show salary ranges on job cards and details."
            checked={features.salaryTransparency}
            onChange={setFeatureValue('salaryTransparency')}
          />
          <Toggle
            label="Resume parsing"
            desc="Extract skills and experience from uploaded CVs."
            checked={features.resumeParsing}
            onChange={setFeatureValue('resumeParsing')}
          />
          <Toggle
            label="Group hiring"
            desc="Let employers review shortlisted candidates together."
            checked={features.groupHiring}
            onChange={setFeatureValue('groupHiring')}
          />
          <Toggle
            label="Candidate matching"
            desc="Surface AI-based match scores on applications."
            checked={features.matching}
            onChange={setFeatureValue('matching')}
          />
        </Card>

        <Card className="hh-card-body hh-mb-4">
          <h3 className="hh-card-title-md hh-mb-2">Maintenance</h3>
          <Toggle
            label="Maintenance mode"
            desc="Temporarily take the site offline for visitors."
            checked={maintenance}
            onChange={setMaintenance}
          />
        </Card>

        <HiringFeeRatesSection />

        <div className="hh-danger-zone">
          <div className="hh-danger-zone-title">Danger zone</div>
          <p>
            Export all platform data or wipe the demo dataset. These actions are destructive
            and logged for audit.
          </p>
          <div className="d-flex flex-wrap gap-2 hh-mt-3">
            <Button variant="outline" icon="bi-download" size="sm">
              Export data
            </Button>
            <Button variant="secondary" size="sm">
              Wipe demo data
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}