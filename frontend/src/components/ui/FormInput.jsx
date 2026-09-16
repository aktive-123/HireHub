export default function FormInput({
  label,
  id,
  type = 'text',
  icon,
  error,
  helperText,
  required = false,
  className = '',
  ...rest
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <div className={icon ? 'input-group' : ''}>
        {icon && (
          <span className="input-group-text bg-white">
            <i className={`bi bi-${icon} text-muted`} aria-hidden="true" />
          </span>
        )}
        <input
          id={inputId}
          type={type}
          required={required}
          className={`form-control ${error ? 'is-invalid' : ''}`}
          {...rest}
        />
        {error && <div className="invalid-feedback">{error}</div>}
      </div>
      {helperText && !error && (
        <div className="form-text text-muted">{helperText}</div>
      )}
    </div>
  )
}
