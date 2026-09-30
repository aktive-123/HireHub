import { useCallback, useEffect, useRef } from 'react'

/**
 * A six-box one-time-password field.
 *
 * Built as one visually-split field rather than six real inputs, because six
 * separate tab stops are miserable with a screen reader and six tab stops in
 * the page is worse. The single input underneath carries the whole value, so
 * paste, mobile keyboards and assistive tech all behave normally, and the boxes
 * are just a rendering of where the caret currently is.
 *
 * Auto-advance and backspace behaviour are the parts people notice: typing
 * moves on, backspace on an empty box steps back, and pasting a full code
 * spreads itself out.
 */
export default function OtpInput({
  id = 'otp-code',
  length = 6,
  value = '',
  onChange,
  disabled = false,
  autoFocus = false,
  hasError = false,
  describedBy,
}) {
  const inputRef = useRef(null)
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, length)

  const focus = useCallback(() => inputRef.current?.focus(), [])

  useEffect(() => {
    if (autoFocus) focus()
  }, [autoFocus, focus])

  const setAt = (index, digit) => {
    const next = digits.split('')
    next[index] = digit
    onChange(next.join('').slice(0, length))
  }

  const handleChange = (event) => {
    const incoming = event.target.value.replace(/\D/g, '')

    // A paste can carry the whole code at once, so anything longer than one
    // digit is treated as a full replacement rather than a single keystroke.
    if (incoming.length > 1) {
      onChange(incoming.slice(0, length))
      return
    }

    if (incoming === '') {
      onChange('')
      return
    }

    setAt(digits.length, incoming)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Backspace' && digits.length === 0) {
      // Nothing left to delete, so let the browser behave normally (leaving the
      // field) instead of trapping focus inside the boxes.
      return
    }

    if (event.key === 'Backspace') {
      event.preventDefault()
      onChange(digits.slice(0, -1))
    }
  }

  return (
    <div className={`hh-otp${hasError ? ' hh-otp--error' : ''}${disabled ? ' hh-otp--disabled' : ''}`}>
      <div className="hh-otp-boxes" onClick={focus} role="presentation">
        {Array.from({ length }, (_, index) => {
          const digit = digits[index] ?? ''
          const isActive = !disabled && index === digits.length

          return (
            <div
              key={index}
              className={`hh-otp-box${digit ? ' hh-otp-box--filled' : ''}${
                isActive ? ' hh-otp-box--active' : ''
              }`}
              aria-hidden="true"
            >
              {digit}
            </div>
          )
        })}
      </div>

      <label htmlFor={id} className="visually-hidden">
        Verification code
      </label>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        // Keeps the platform numeric keypad on a phone without letting a
        // password manager fill this field with something unexpected.
        autoComplete="one-time-code"
        pattern="\d*"
        maxLength={length}
        className="hh-otp-input"
        value={digits}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={(event) => event.target.select()}
        onBlur={(event) => event.target.setSelectionRange(digits.length, digits.length)}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        required
      />
    </div>
  )
}
