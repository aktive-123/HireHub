export default function FormSelect({
  label,
  id,
  options = [],
  error,
  helperText,
  required = false,
  className = '',
  placeholder = 'Select an option',
  ...rest
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <select
        id={selectId}
        required={required}
        className={`form-select ${error ? 'is-invalid' : ''}`}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const value = typeof opt === 'object' ? opt.value : opt
          const labelText = typeof opt === 'object' ? opt.label : opt
          return (
            <option key={value} value={value}>
              {labelText}
            </option>
          )
        })}
      </select>
      {error && <div className="invalid-feedback">{error}</div>}
      {helperText && !error && (
        <div className="form-text text-muted">{helperText}</div>
      )}
    </div>
  )
}
