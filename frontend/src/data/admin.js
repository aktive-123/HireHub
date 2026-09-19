// Admin console mock data — derives from the shared public datasets so the
// admin views stay in sync with the rest of the product. Mirrors the shape
// the planned Laravel /api/admin/* endpoints will return.

import { applicants } from './applicants'
import { publicCompanies } from './companies'
import { publicJobs, publicJobCategories } from './jobs'

export const ROLE_LABELS = {
  seeker: 'Job Seeker',
  employer: 'Employer',
  admin: 'Admin',
}

export const ROLE_VARIANT = {
  seeker: 'info',
  employer: 'primary',
  admin: 'accent',
}

export const ACCOUNT_LABELS = {
  active: 'Active',
  suspended: 'Suspended',
  pending: 'Pending',
}

export const ACCOUNT_VARIANT = {
  active: 'success',
  suspended: 'danger',
  pending: 'warning',
}

export const MODERATION_LABELS = {
  published: 'Published',
  pending: 'Pending review',
  flagged: 'Flagged',
}

export const MODERATION_VARIANT = {
  published: 'success',
  pending: 'warning',
  flagged: 'danger',
}

export const CATEGORY_STATUS_LABELS = {
  active: 'Active',
  hidden: 'Hidden',
}

const JOINED_DATES = [
  'Jan 12, 2025',
  'Feb 03, 2025',
  'Mar 21, 2025',
  'Apr 08, 2025',
  'May 27, 2025',
  'Jun 14, 2025',
  'Jul 02, 2025',
  'Aug 19, 2025',
]

const LAST_ACTIVE = [
  '2 minutes ago',
  '18 minutes ago',
  '1 hour ago',
  '3 hours ago',
  'Yesterday',
  '2 days ago',
  '5 days ago',
  '1 week ago',
]

const EMPLOYER_CONTACTS = [
  'David Okafor',
  'Grace Adeyemi',
  'Samuel Adeleke',
  'Amina Yusuf',
  'Chinedu Okeke',
  'Bola Ajayi',
  'Nneka Uche',
  'Tunde Salami',
]

export const adminJobSeekers = applicants.map((applicant, i) => ({
  id: applicant.id,
  name: applicant.name,
  email: applicant.email,
  location: applicant.location,
  years: applicant.years,
  applications: 3 + ((i * 7) % 12),
  saved_jobs: 2 + ((i * 5) % 9),
  status: i === 4 || i === 9 ? 'suspended' : 'active',
  joined: JOINED_DATES[i % JOINED_DATES.length],
  last_active: LAST_ACTIVE[i % LAST_ACTIVE.length],
}))

export const adminEmployers = publicCompanies.map((company, i) => ({
  id: `emp-${i + 1}`,
  company: company.name,
  logoText: company.logoText,
  logoBg: company.logoBg,
  logoColor: company.logoColor,
  contact: EMPLOYER_CONTACTS[i % EMPLOYER_CONTACTS.length],
  email: `hr@${company.slug}.com`,
  industry: company.industry,
  location: company.location,
  jobs: company.open_jobs_count,
  verified: company.is_verified,
  status: i === 3 ? 'pending' : i === 6 ? 'suspended' : 'active',
  joined: JOINED_DATES[(i + 3) % JOINED_DATES.length],
  last_active: LAST_ACTIVE[(i + 2) % LAST_ACTIVE.length],
}))

export const adminCompanies = publicCompanies.map((company, i) => ({
  id: company.id,
  name: company.name,
  slug: company.slug,
  logoText: company.logoText,
  logoBg: company.logoBg,
  logoColor: company.logoColor,
  industry: company.industry,
  location: company.location,
  size: company.size,
  jobs: company.open_jobs_count,
  verified: company.is_verified,
  status: i === 2 ? 'pending' : 'active',
  joined: JOINED_DATES[(i + 1) % JOINED_DATES.length],
}))

export const adminUsers = [
  ...adminJobSeekers.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: 'seeker',
    status: user.status,
    joined: user.joined,
    last_active: user.last_active,
  })),
  ...adminEmployers.map((employer) => ({
    id: employer.id,
    name: employer.contact,
    email: employer.email,
    role: 'employer',
    status: employer.status,
    joined: employer.joined,
    last_active: employer.last_active,
  })),
  {
    id: 'adm-1',
    name: 'Sarah Bello',
    email: 'sarah.admin@hirehub.com',
    role: 'admin',
    status: 'active',
    joined: 'Jan 02, 2025',
    last_active: 'Just now',
  },
  {
    id: 'adm-2',
    name: 'Platform Bot',
    email: 'system@hirehub.com',
    role: 'admin',
    status: 'active',
    joined: 'Jan 02, 2025',
    last_active: '12 minutes ago',
  },
]

export const adminJobs = publicJobs.map((job, i) => ({
  id: job.id,
  title: job.title,
  company: job.company.name,
  category: job.category,
  location: job.location,
  type: job.employment_type,
  applications: job.applications_count,
  views: job.views,
  posted: job.posted_days_ago === 0 ? 'Today' : `${job.posted_days_ago} days ago`,
  status: i % 6 === 0 ? 'pending' : i % 7 === 3 ? 'flagged' : 'published',
}))

export const adminApplications = applicants.map((applicant, i) => {
  const matchedJob = publicJobs.find((job) => job.title === applicant.job)
  const company = matchedJob?.company?.name || publicCompanies[i % publicCompanies.length].name
  return {
    id: `app-${applicant.id}`,
    applicant: applicant.name,
    email: applicant.email,
    job: applicant.job,
    company,
    applied: applicant.applied,
    match: applicant.match,
    status: applicant.status,
  }
})

export const adminCategories = publicJobCategories.map((category, i) => ({
  id: category.id,
  name: category.name,
  icon: category.icon,
  jobs: 120 + i * 37,
  status: i === 6 ? 'hidden' : 'active',
}))

const SKILL_NAMES = [
  'React',
  'TypeScript',
  'Node.js',
  'Python',
  'SQL',
  'Figma',
  'AWS',
  'Docker',
  'Kubernetes',
  'Go',
  'Product Design',
  'REST APIs',
  'GraphQL',
  'PostgreSQL',
  'Communication',
  'Agile',
]

const SKILL_CATEGORIES = ['Technology', 'Design', 'Business']

export const adminSkills = SKILL_NAMES.map((name, i) => ({
  id: `skill-${i + 1}`,
  name,
  category: SKILL_CATEGORIES[i % SKILL_CATEGORIES.length],
  usage: 42 + ((i * 53) % 360),
  trend: i % 4 === 0 ? 'up' : i % 4 === 3 ? 'down' : 'flat',
  status: i === 14 ? 'hidden' : 'active',
}))

export const activityLogs = [
  { id: 'log-1', actor: 'David Okafor', action: 'published a new job', target: 'Senior Frontend Developer', type: 'success', time: '2 minutes ago' },
  { id: 'log-2', actor: 'Sarah Bello', action: 'suspended the account of', target: 'Ngozi Eze', type: 'danger', time: '24 minutes ago' },
  { id: 'log-3', actor: 'Ada Obi', action: 'submitted an application for', target: 'Senior Frontend Developer', type: 'info', time: '1 hour ago' },
  { id: 'log-4', actor: 'System', action: 'flagged a job posting', target: 'Crypto Growth Hacker', type: 'warning', time: '2 hours ago' },
  { id: 'log-5', actor: 'Grace Adeyemi', action: 'verified the company profile for', target: 'Flutterwave', type: 'success', time: '3 hours ago' },
  { id: 'log-6', actor: 'Sarah Bello', action: 'updated platform settings', target: 'Moderation rules', type: 'info', time: '5 hours ago' },
  { id: 'log-7', actor: 'Tunde Bakare', action: 'created an account as', target: 'Job Seeker', type: 'info', time: '6 hours ago' },
  { id: 'log-8', actor: 'Chinedu Okeke', action: 'posted a job', target: 'Backend Developer', type: 'success', time: '8 hours ago' },
  { id: 'log-9', actor: 'System', action: 'expired a job listing', target: 'Junior Data Analyst', type: 'warning', time: 'Yesterday' },
  { id: 'log-10', actor: 'Sarah Bello', action: 'removed a skill', target: 'jQuery', type: 'danger', time: 'Yesterday' },
  { id: 'log-11', actor: 'Amina Yusuf', action: 'shortlisted a candidate', target: 'Ada Obi', type: 'success', time: '2 days ago' },
  { id: 'log-12', actor: 'Platform Bot', action: 'sent weekly digest to', target: '12,400 job seekers', type: 'info', time: '2 days ago' },
  { id: 'log-13', actor: 'Bola Ajayi', action: 'edited the company profile for', target: 'Paystack', type: 'info', time: '3 days ago' },
  { id: 'log-14', actor: 'Sarah Bello', action: 'deleted a spam application from', target: 'unknown user', type: 'danger', time: '3 days ago' },
  { id: 'log-15', actor: 'System', action: 'scheduled a database backup', target: 'Production', type: 'success', time: '4 days ago' },
  { id: 'log-16', actor: 'Nneka Uche', action: 'invited a teammate to', target: 'Google', type: 'info', time: '5 days ago' },
]

export const adminNotifications = [
  {
    id: 'nt-1',
    type: 'danger',
    icon: 'shield-exclamation',
    text: 'Job "Crypto Growth Hacker" was flagged and needs review.',
    time: '2 hours ago',
    unread: true,
  },
  {
    id: 'nt-2',
    type: 'success',
    icon: 'patch-check',
    text: 'Flutterwave was verified by Grace Adeyemi.',
    time: '4 hours ago',
    unread: true,
  },
  {
    id: 'nt-3',
    type: 'warning',
    icon: 'people',
    text: '4 new job seekers signed up in the last 24 hours.',
    time: '6 hours ago',
    unread: true,
  },
  {
    id: 'nt-4',
    type: 'info',
    icon: 'hourglass-split',
    text: '3 employer accounts are awaiting approval.',
    time: 'Yesterday',
    unread: false,
  },
  {
    id: 'nt-5',
    type: 'success',
    icon: 'journal-text',
    text: 'Weekly platform digest is ready to review.',
    time: 'Yesterday',
    unread: false,
  },
]

export const adminStats = [
  { key: 'seekers', label: 'Job Seekers', value: '45,280', icon: 'bi-person-badge', tone: 'primary', to: '/admin/job-seekers' },
  { key: 'employers', label: 'Employers', value: '1,248', icon: 'bi-briefcase', tone: 'info', to: '/admin/employers' },
  { key: 'companies', label: 'Companies', value: '860', icon: 'bi-buildings', tone: 'success', to: '/admin/companies' },
  { key: 'jobs', label: 'Active Jobs', value: '12,430', icon: 'bi-file-earmark-text', tone: 'warning', to: '/admin/jobs' },
  { key: 'applications', label: 'Applications', value: '58,900', icon: 'bi-inbox', tone: 'primary', to: '/admin/applications' },
  { key: 'hired', label: 'Hired', value: '3,410', icon: 'bi-patch-check', tone: 'success', to: '/admin/reports' },
  { key: 'pending', label: 'Pending Review', value: '37', icon: 'bi-shield-exclamation', tone: 'danger', to: '/admin/jobs' },
  { key: 'categories', label: 'Categories', value: publicJobCategories.length, icon: 'bi-tags', tone: 'secondary', to: '/admin/categories' },
]

export const applicationsByMonth = [
  { label: 'Jan', value: 2840 },
  { label: 'Feb', value: 3260 },
  { label: 'Mar', value: 3980 },
  { label: 'Apr', value: 4410 },
  { label: 'May', value: 5120 },
  { label: 'Jun', value: 4780 },
  { label: 'Jul', value: 5560 },
  { label: 'Aug', value: 6240 },
  { label: 'Sep', value: 6980 },
]

export const categoryDistribution = adminCategories.map((category) => ({
  label: category.name,
  value: category.jobs,
}))

export const topCompanies = [...publicCompanies]
  .sort((a, b) => b.open_jobs_count - a.open_jobs_count)
  .slice(0, 5)
  .map((company, i) => ({
    id: company.id,
    name: company.name,
    logoText: company.logoText,
    logoBg: company.logoBg,
    logoColor: company.logoColor,
    jobs: company.open_jobs_count,
    applications: company.reviews_count ? Math.round(company.reviews_count / 12) : 40 + i * 23,
  }))
