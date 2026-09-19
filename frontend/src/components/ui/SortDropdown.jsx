import { useEffect, useRef, useState } from 'react'

export default function SortDropdown({
  options,
  value,
  onChange,
  label = 'Sort',
  className = '',
  ariaLabel = 'Sort options',
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const current = options.find((o) => o.value === value)

  const select = (next) => {
    onChange(next)
    setOpen(false)
  }

  const triggerLabel = current?.label ?? (options[0]?.label ?? 'Select')

  return (
    <div ref={ref} className={`hh-sort-dropdown ${className}`.trim()} aria-label={ariaLabel}>
      <button
        type="button"
        className="hh-sort-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <i className="bi bi-arrow-down-up" aria-hidden="true" />
        <span className="hh-sort-trigger-label">
          {label}: {triggerLabel}
        </span>
        <i
          className={`bi bi-chevron-down hh-sort-chevron ${open ? 'is-open' : ''}`}
          aria-hidden="true"
        />
      </button>

      <ul className={`hh-sort-menu ${open ? 'is-open' : ''}`} role="listbox" aria-label={label}>
        {options.map((opt) => (
          <li key={opt.value} role="none">
            <button
              type="button"
              role="option"
              aria-selected={opt.value === value}
              className={`hh-sort-option ${opt.value === value ? 'is-selected' : ''}`}
              onClick={() => select(opt.value)}
            >
              <span>{opt.label}</span>
              {opt.value === value && <i className="bi bi-check2" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}