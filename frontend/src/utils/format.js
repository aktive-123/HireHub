export function formatSalary(min, max, { currency = '$', locale = 'en-US', notation = 'compact' } = {}) {
  const format = (value) =>
    new Intl.NumberFormat(locale, { notation, maximumFractionDigits: 0 }).format(value)
  if (min == null && max == null) return ''
  if (min == null) return `${currency}${format(max)}`
  if (max == null || min === max) return `${currency}${format(min)}`
  return `${currency}${format(min)} – ${currency}${format(max)}`
}

export function formatDate(value, { locale = 'en-US', style = 'medium' } = {}) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, { dateStyle: style }).format(date)
}

export function timeAgo(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ]
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds)
    if (count >= 1) {
      return count === 1 ? `1 ${interval.label} ago` : `${count} ${interval.label}s ago`
    }
  }
  return 'just now'
}

export function truncate(text, length = 120) {
  if (!text) return ''
  if (text.length <= length) return text
  const cut = text.slice(0, length)
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    || 'HH'
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural
}

export function toLowerCase(str = '') {
  return str.toLowerCase()
}

export function slugify(str = '') {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}