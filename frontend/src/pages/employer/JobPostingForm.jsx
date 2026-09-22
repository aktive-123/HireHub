import { useState } from 'react'
import Card from '../../components/ui/Card'
import Reveal from '../../components/ui/Reveal'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import FormSelect from '../../components/ui/FormSelect'
import { publicJobCategories } from '../../data/jobs'

const CATEGORY_OPTIONS = publicJobCategories.map((c) => ({ value: c.name, label: c.name }))
const WORKPLACE_OPTIONS = ['On-site', 'Hybrid', 'Remote']
const EMPLOYMENT_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Internship']
const LEVEL_OPTIONS = ['Entry Level', 'Mid Level', 'Senior', 'Lead']
const SALARY_PERIOD_OPTIONS = [
  { value: 'hour', label: 'Per hour' },
  { value: 'week', label: 'Per week' },
  { value: 'month', label: 'Per month' },
  { value: 'year', label: 'Per year' },
]

const FIELD_GROUPS = {
  title: 'Job Title',
}

const WORKPLACE_LABELS = { 'on-site': 'On-site', hybrid: 'Hybrid', remote: 'Remote' }
const EMPLOYMENT_LABELS = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
}

const splitLines = (value) =>
  (value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

const splitTags = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const toNumber = (value) =>
  value === '' || value == null ? null : Number(value)

export function buildJobPayload(values) {
  return {
    title: values.title?.trim(),
    category: values.category || null,
    location: values.location,
    workplace: (values.workplace || '').toLowerCase(),
    employment_type: (values.employment_type || '')
      .toLowerCase()
      .replace(' ', '-'),
    level: values.level || null,
    salary_min: toNumber(values.salary_min),
    salary_max: toNumber(values.salary_max),
    salary_currency: values.salary_currency || 'USD',
    salary_period: values.salary_period || 'year',
    description: values.description,
    responsibilities: splitLines(values.responsibilities),
    requirements: splitLines(values.requirements),
    benefits: splitLines(values.benefits),
    tags: splitTags(values.skills),
    deadline: values.deadline || null,
  }
}

function buildJobValues(job) {
  if (!job) {
    return {
      title: '',
      category: '',
      location: 'Lagos, Nigeria',
      workplace: 'On-site',
      employment_type: 'Full-time',
      level: 'Mid Level',
      salary_min: '',
      salary_max: '',
      salary_currency: '',
      salary_period: 'year',
      description: '',
      responsibilities: '',
      requirements: '',
      skills: '',
      benefits: '',
      deadline: '',
    }
  }
  const employmentKey = String(job.employment_type ?? job.type ?? '').toLowerCase()
  return {
    title: job.title || '',
    category: job.category || '',
    location: job.location || 'Lagos, Nigeria',
    workplace: WORKPLACE_LABELS[String(job.workplace || '').toLowerCase()] || job.workplace || 'On-site',
    employment_type: EMPLOYMENT_LABELS[employmentKey] || job.employment_type || job.type || 'Full-time',
    level: job.level || 'Mid Level',
    salary_min: job.salary?.min ?? '',
    salary_max: job.salary?.max ?? '',
    salary_currency: job.salary?.currency || '',
    salary_period: job.salary?.period || 'year',
    description: job.description || '',
    responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities.join('\n') : '',
    requirements: Array.isArray(job.requirements) ? job.requirements.join('\n') : '',
    skills: Array.isArray(job.tags) ? job.tags.join(', ') : '',
    benefits: Array.isArray(job.benefits) ? job.benefits.join('\n') : '',
    deadline: job.deadline ? String(job.deadline).slice(0, 10) : '',
  }
}

export default function JobPostingForm({ job, submitLabel = 'Publish job', onSave }) {
  const [values, setValues] = useState(() => buildJobValues(job))

  const set = (key, value) => setValues((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e, action) => {
    e?.preventDefault?.()
    onSave({ ...values, action })
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, 'publish')}>
      <Reveal>
        <Card className="hh-card-body hh-mb-4">
          <div className="hh-card-title-md hh-mb-4">Job information</div>
          <div className="row g-3">
            <div className="col-12">
              <FormInput
                label={FIELD_GROUPS.title}
                placeholder="e.g. Senior Frontend Developer"
                value={values.title}
                onChange={(e) => set('title', e.target.value)}
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <FormSelect
                label="Category"
                options={CATEGORY_OPTIONS}
                value={values.category || ''}
                onChange={(e) => set('category', e.target.value)}
                placeholder="Select a category"
              />
            </div>
            <div className="col-12 col-md-6">
              <FormInput
                label="Location"
                placeholder="e.g. Lagos, Nigeria"
                value={values.location}
                onChange={(e) => set('location', e.target.value)}
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <FormSelect
                label="Workplace type"
                options={WORKPLACE_OPTIONS}
                value={values.workplace}
                onChange={(e) => set('workplace', e.target.value)}
                placeholder="Select workplace type"
              />
            </div>
            <div className="col-12 col-md-6">
              <FormSelect
                label="Employment type"
                options={EMPLOYMENT_OPTIONS}
                value={values.employment_type}
                onChange={(e) => set('employment_type', e.target.value)}
                placeholder="Select employment type"
              />
            </div>
            <div className="col-12 col-md-6">
              <FormSelect
                label="Experience level"
                options={LEVEL_OPTIONS}
                value={values.level}
                onChange={(e) => set('level', e.target.value)}
                placeholder="Select experience level"
              />
            </div>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={40}>
        <Card className="hh-card-body hh-mb-4">
          <div className="hh-card-title-md hh-mb-4">Compensation</div>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <FormInput
                label="Minimum salary"
                type="number"
                min="0"
                placeholder="30000"
                value={values.salary_min}
                onChange={(e) => set('salary_min', e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4">
              <FormInput
                label="Maximum salary"
                type="number"
                min="0"
                placeholder="50000"
                value={values.salary_max}
                onChange={(e) => set('salary_max', e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4">
              <FormSelect
                label="Salary period"
                options={SALARY_PERIOD_OPTIONS}
                value={values.salary_period}
                onChange={(e) => set('salary_period', e.target.value)}
                placeholder="Select salary period"
              />
            </div>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={80}>
        <Card className="hh-card-body hh-mb-4">
          <div className="hh-card-title-md hh-mb-4">Job description</div>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label" htmlFor="job-description">
                Description
              </label>
              <textarea
                id="job-description"
                className="form-control"
                rows={4}
                placeholder="Describe the role, team and why someone would love it…"
                value={values.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="job-responsibilities">
                Responsibilities <span className="text-muted hh-small">(one per line)</span>
              </label>
              <textarea
                id="job-responsibilities"
                className="form-control"
                rows={5}
                placeholder={'Build and ship accessible UI\nMentor junior engineers'}
                value={values.responsibilities}
                onChange={(e) => set('responsibilities', e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="job-requirements">
                Requirements <span className="text-muted hh-small">(one per line)</span>
              </label>
              <textarea
                id="job-requirements"
                className="form-control"
                rows={5}
                placeholder={'5+ years of React experience\nStrong TypeScript skills'}
                value={values.requirements}
                onChange={(e) => set('requirements', e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <FormInput
                label="Skills"
                placeholder="React, TypeScript, CSS"
                helperText="Separate skills with commas."
                value={values.skills}
                onChange={(e) => set('skills', e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="job-benefits">
                Benefits <span className="text-muted hh-small">(one per line)</span>
              </label>
              <textarea
                id="job-benefits"
                className="form-control"
                rows={3}
                placeholder={'Health, dental and vision coverage\nAnnual learning budget'}
                value={values.benefits}
                onChange={(e) => set('benefits', e.target.value)}
              />
            </div>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={120}>
        <Card className="hh-card-body hh-mb-4">
          <div className="hh-card-title-md hh-mb-4">Application details</div>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <FormInput
                label="Application deadline"
                type="date"
                value={values.deadline}
                onChange={(e) => set('deadline', e.target.value)}
              />
            </div>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={160}>
        <div className="hh-toolbar hh-toolbar-between flex-wrap">
          <Button type="button" variant="ghost" icon="bi-file-earmark-text" onClick={() => onSave({ ...values, action: 'draft' })}>
            Save draft
          </Button>
          <div className="d-flex flex-wrap gap-2">
            <Button type="button" variant="outline-primary" icon="bi-eye" onClick={() => onSave({ ...values, action: 'preview' })}>
              Preview job
            </Button>
            <Button type="submit" variant="primary" icon="bi-send" pill>
              {submitLabel}
            </Button>
          </div>
        </div>
      </Reveal>
    </form>
  )
}