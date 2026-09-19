import { Link } from 'react-router-dom'

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export default function UserCell({
  name,
  meta,
  to,
  logoText,
  logoBg,
  logoColor,
  square = false,
}) {
  const initials = logoText || getInitials(name)
  const style =
    logoBg || logoColor
      ? { background: logoBg || '#f1f5f9', color: logoColor || 'var(--hh-primary)' }
      : undefined

  return (
    <div className="hh-applicant-cell">
      <span
        className={`hh-avatar hh-avatar-xs hh-avatar-soft ${square ? 'hh-avatar-square' : ''}`}
        style={style}
        aria-hidden="true"
      >
        {initials}
      </span>
      <div className="hh-applicant-meta">
        {to ? (
          <Link to={to} className="hh-applicant-name">
            {name}
          </Link>
        ) : (
          <span className="hh-applicant-name">{name}</span>
        )}
        {meta && <span className="hh-applicant-email">{meta}</span>}
      </div>
    </div>
  )
}