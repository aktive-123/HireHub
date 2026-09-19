const PALETTE = [
  { bg: 'rgba(0, 84, 236, 0.12)', fg: '#0054ec' },
  { bg: 'rgba(4, 232, 164, 0.16)', fg: '#038a66' },
  { bg: 'rgba(5, 29, 67, 0.12)', fg: '#051d43' },
  { bg: 'rgba(245, 158, 11, 0.16)', fg: '#b45309' },
  { bg: 'rgba(8, 145, 178, 0.14)', fg: '#155e75' },
]

function hashString(value) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function getInitials(name) {
  const clean = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join('')
  return clean.slice(0, 2).toUpperCase() || '?'
}

export default function AuthorAvatar({ name, size }) {
  const tone = PALETTE[hashString(name) % PALETTE.length]
  const style = {
    background: tone.bg,
    color: tone.fg,
    ...(size ? { width: size, height: size, fontSize: Math.round(size * 0.38) } : {}),
  }
  return (
    <span className="hh-author-avatar" style={style} aria-hidden="true">
      {getInitials(name)}
    </span>
  )
}