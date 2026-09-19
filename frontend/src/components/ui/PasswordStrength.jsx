import ValidationChecklist from './ValidationChecklist'

const checksFor = (value) => [
  { ok: value.length >= 8, label: 'At least 8 characters' },
  { ok: /[a-z]/i.test(value), label: 'Contains letters' },
  { ok: /\d/.test(value), label: 'Contains numbers' },
]

function strengthOf(value) {
  if (!value) return { level: '', fill: 0 }

  if (value.length < 8) return { level: 'weak', fill: 1 }

  const hasLower = /[a-z]/.test(value)
  const hasUpper = /[A-Z]/.test(value)
  const hasNum = /\d/.test(value)
  const hasSpecial = /[^A-Za-z0-9]/.test(value)
  const long = value.length >= 12

  const variety = [hasLower, hasUpper, hasNum, hasSpecial, long].filter(Boolean).length

  if (variety >= 4) return { level: 'strong', fill: 4 }
  if (variety >= 2) return { level: 'medium', fill: Math.max(2, Math.min(3, variety - 1)) }
  return { level: 'weak', fill: 1 }
}

const METER_LABELS = { strong: 'Strong', medium: 'Medium', weak: 'Weak' }

export default function PasswordStrength({ value = '' }) {
  const { level, fill } = strengthOf(value)

  return (
    <div className="hh-password-strength">
      {value && (
        <div className={`hh-password-meter is-${level}`} role="status" aria-live="polite">
          <span className="hh-password-meter-label">{METER_LABELS[level]}</span>
          <div className="hh-password-meter-track">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`hh-password-meter-seg ${i < fill ? 'is-filled' : ''}`}
              />
            ))}
          </div>
        </div>
      )}
      <ValidationChecklist items={checksFor(value)} ariaLabel="Password requirements" />
    </div>
  )
}