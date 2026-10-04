import { initials } from '../../utils/format'

export default function UserAvatar({
  name,
  avatarUrl,
  className,
  square = false,
  onClick,
  label,
  disabled = false,
}) {
  const fallback = initials(name || '')
  const interactive = typeof onClick === 'function'
  const handleKeyDown = (event) => {
    if (interactive && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      if (!disabled) onClick()
    }
  }

  return (
    <span
      className={`${className} ${square ? 'hh-avatar-square' : ''}${interactive ? ' hh-avatar-editable' : ''}`}
      aria-hidden={interactive ? undefined : true}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive && !disabled ? 0 : undefined}
      aria-label={interactive ? label : undefined}
      aria-disabled={interactive ? disabled : undefined}
      onClick={interactive && !disabled ? onClick : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: interactive && !disabled ? 'pointer' : undefined,
      }}
    >
      {fallback}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: square ? 'inherit' : '50%',
          }}
        />
      ) : null}
      {interactive ? (
        <span
          className="hh-avatar-camera-overlay"
        >
          <i className="bi bi-camera-fill" aria-hidden="true" />
          <span className="visually-hidden">Change profile photo</span>
        </span>
      ) : null}
    </span>
  )
}
