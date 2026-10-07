import { useState } from 'react'

export default function FormInput({
  label,
  id,
  type = 'text',
  icon,
  error,
  helperText,
  required = false,
  className = '',
  disabled,
  ...rest
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  // Password fields carry the same show/hide affordance the sign-in screens
  // use (.hh-password-toggle, auth.css): the eye lives inside the field's
  // input group, so it reads as part of the control rather than a button
  // floating beside it. Only one field's own reveal state lives here, so the
  // three password inputs on a change-password card toggle independently.
  const [revealed, setRevealed] = useState(false)
  const masked = type === 'password'
  const effectiveType = masked && revealed ? 'text' : type

  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className={icon || masked ? 'input-group' : ''}>
        {icon && (
          <span className="input-group-text bg-white">
            <i className={`bi bi-${icon} text-muted`} aria-hidden="true" />
          </span>
        )}
        <input
          id={inputId}
          type={effectiveType}
          required={required}
          disabled={disabled}
          className={`form-control ${error ? 'is-invalid' : ''}`}
          {...rest}
        />
        {masked && (
          <button
            type="button"
            className="hh-password-toggle"
            aria-label={revealed ? 'Hide password' : 'Show password'}
            disabled={disabled}
            onClick={() => setRevealed((prev) => !prev)}
          >
            <i className={`bi ${revealed ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
          </button>
        )}
        {error && <div className="invalid-feedback">{error}</div>}
      </div>
      {helperText && !error && (
        <div className="form-text text-muted">{helperText}</div>
      )}
    </div>
  )
}
