// Adapters that map /v1/admin/* API responses onto the shapes the admin
// console views already render. Keeps mock-driven pages working while the
// backend becomes the source of truth, and falls back gracefully.

const statusLabel = (status) => {
  if (status === 'open' || status === 'published' || status === 'active') return 'active'
  return status || 'active'
}

export const adaptUsers = (res) => ({
  items: (res.items ?? []).map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    role: user.role === 'seeker' ? 'seeker' : user.role === 'employer' ? 'employer' : user.role || 'seeker',
    role_label: user.role_label ?? user.role,
    status: statusLabel(user.status),
    status_label: user.status_label ?? statusLabel(user.status),
    headline: user.headline ?? '—',
    location: user.location ?? '—',
    verified: user.verified ?? false,
    company: user.company ?? '—',
    joined: user.joined ?? user.joined_at ?? '—',
    // Real "last activity" from the API. Previously this echoed the join date,
    // which made every account look dormant on the day it was created.
    last_active: user.last_active ?? '—',
  })),
})

export const adaptJobSeekers = (res) => ({
  items: (res.items ?? []).map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    headline: user.headline ?? '—',
    location: user.location ?? '—',
    // Real counts; '—' when the seeker has not filled the field in, rather
    // than a hardcoded null/zero that looked like data.
    years: user.years_experience ?? '—',
    applications: user.applications_count ?? 0,
    saved_jobs: user.saved_jobs_count ?? 0,
    status: statusLabel(user.status),
    joined: user.joined ?? user.joined_at ?? '—',
    last_active: user.last_active ?? '—',
  })),
})

export const adaptEmployers = (res) => ({
  items: (res.items ?? []).map((user) => ({
    id: user.id,
    company: user.company ?? user.name,
    company_slug: user.company_slug ?? '',
    contact: user.name,
    email: user.email,
    phone: user.phone ?? '',
    industry: user.industry ?? '—',
    location: user.location ?? '—',
    jobs: user.jobs_count ?? 0,
    verified: user.verified ?? false,
    status: statusLabel(user.status),
    joined: user.joined ?? user.joined_at ?? '—',
    last_active: user.last_active ?? '—',
  })),
})

export const adaptCompanies = (res) => ({
  items: (res.items ?? []).map((company) => ({
    // Company binds routes by slug, so `id` carries the addressable key.
    id: company.slug ?? company.id,
    name: company.name,
    slug: company.slug ?? company.id,
    industry: company.industry ?? '—',
    location: company.location ?? '—',
    size: company.size ?? '—',
    // Kept alongside the display value so the edit form can prefill from the
    // real record instead of re-typing it.
    website: company.website ?? '',
    tagline: company.tagline ?? '',
    description: company.description ?? '',
    logo_text: company.logo_text ?? '',
    jobs: company.jobs_count ?? 0,
    verified: company.verified ?? false,
    status: statusLabel(company.status),
    joined: company.created_at ? new Date(company.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
  })),
})

export const adaptJobs = (res) => ({
  items: (res.items ?? []).map((job) => ({
    // Job binds routes by slug, so `id` carries the addressable key — sending
    // the surrogate key here made every status change and delete 404.
    id: job.slug ?? job.id,
    title: job.title,
    company: job.company,
    category: job.category ?? '—',
    location: job.location ?? '—',
    type: job.type,
    applications: job.applications ?? 0,
    views: job.views ?? 0,
    posted: job.posted ?? '—',
    status: job.status === 'open' ? 'published' : job.status ?? 'published',
  })),
})

export const adaptApplications = (res) => ({
  items: (res.items ?? []).map((app) => ({
    // ApplicationResource exposes a public `app-{id}`, but the admin
    // application routes bind by the numeric key. Normalising here keeps the
    // table's row identity and the id used for detail/status calls in step.
    id: String(app.id).replace(/^app-/, ''),
    application_id: String(app.id).replace(/^app-/, ''),
    applicant: app.name,
    email: app.email ?? '—',
    job: app.job,
    company: app.company,
    applied: app.applied,
    match: app.match ?? 0,
    status: app.status,
  })),
})

export const adaptCategories = (res) => ({
  items: (res ?? []).map((category) => ({
    // The Category model binds routes by slug (getRouteKeyName), so the
    // identifier has to survive the adapter or every update/delete 404s.
    id: category.slug ?? category.id,
    slug: category.slug,
    name: category.name,
    icon: category.icon,
    description: category.description,
    jobs: category.jobs_count ?? 0,
    status: category.status === 'inactive' ? 'hidden' : 'active',
  })),
})

/**
 * Skills are not a table on the platform: the admin endpoint derives them by
 * counting free-text entries inside `profiles.skills` and `jobs.tags`. So a
 * skill has no id, no category, no status and no trend — the previous adapter
 * invented all of them, which produced permanently empty category tabs and a
 * "Steady" badge that could never mean anything. Only the two real fields are
 * mapped, and the skill name doubles as the row key.
 */
export const adaptSkills = (res) => ({
  items: (res ?? []).map((skill) => ({
    id: skill.name,
    name: skill.name,
    usage: skill.count ?? 0,
  })),
})

export const adaptActivityLogs = (res) => ({
  items: (res.items ?? []).map((log) => ({
    id: log.id,
    actor: log.actor,
    action: log.action,
    target: log.target ?? '—',
    type: log.level === 'danger' ? 'danger' : log.level === 'success' ? 'success' : log.level === 'warning' ? 'warning' : 'info',
    time: log.time ?? '—',
  })),
})