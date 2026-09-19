const SALARY_PERIOD_MAP = { hour: 'Hourly', week: 'Weekly', month: 'Monthly', year: 'Annual' }

export function formatSalaryAmount(salary) {
  if (!salary) return 'Salary on application'
  const fmt = (n) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: salary.currency || 'USD',
      maximumFractionDigits: 0,
    }).format(n)

  if (salary.min == null && salary.max == null) return 'Salary on application'
  if (salary.min == null) return `Up to ${fmt(salary.max)}`
  if (salary.max == null) return `${fmt(salary.min)}+`
  return `${fmt(salary.min)} - ${fmt(salary.max)}`
}

export function formatSalaryPeriod(salary) {
  if (!salary?.period) return 'Annual'
  return SALARY_PERIOD_MAP[salary.period] || salary.period
}

/*
 * Badge colour system (formal) — keep consistent everywhere:
 *   - Amber/`accent`  = Featured / highlighted status (bi-star-fill / bi-lightning-fill)
 *   - `primary` blue  = Employment type (Full-time, Part-time, Contract, Internship, Remote)
 *   - `secondary`     = Experience level, neutral + informational (often with `outline`)
 *   - Neutral soft    = tags/skills (hh-badge-soft)
 * Green is intentionally not used for badges anywhere in the site.
 */
export function getEmploymentBadge(job) {
  const map = {
    'Full-time': { variant: 'primary', icon: 'clock' },
    'Part-time': { variant: 'primary', icon: 'clock-history' },
    Contract: { variant: 'primary', icon: 'file-earmark-text' },
    Internship: { variant: 'primary', icon: 'mortarboard' },
    Remote: { variant: 'primary', icon: 'laptop' },
  }
  const key = job.employment_type || job.workplace || 'Full-time'
  const cfg = map[key] || map['Full-time']
  return { label: key, ...cfg }
}