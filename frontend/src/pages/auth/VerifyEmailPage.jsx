import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Alert from '../../components/ui/Alert'

export default function VerifyEmailPage() {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [resent, setResent] = useState(false)

  const handleChange = (index, value) => {
    const digits = value.replace(/\D/g, '')
    const next = [...code]

    next[index] = digits.slice(-1)
    setCode(next)

    if (digits && index < code.length - 1) {
      const inputs = document.querySelectorAll('.hh-auth-code-input')
      const target = inputs[index + 1]
      if (target) {
        target.focus()
      }
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const inputs = document.querySelectorAll('.hh-auth-code-input')
      const target = inputs[index - 1]
      if (target) {
        target.focus()
      }
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '')
    const next = [...code]

    pasted.split('').slice(0, code.length).forEach((digit, i) => {
      next[i] = digit
    })

    setCode(next)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const entered = code.join('')
    if (entered.length !== code.length) {
      setError('Please enter the complete 6-digit verification code.')
      return
    }

    setSubmitted(true)
  }

  return (
    <div className="hh-auth-card">
      <div className="text-center mb-4">
        <div className="hh-auth-eyebrow justify-content-center">
          <i className="bi bi-envelope-check" aria-hidden="true" />
          Verify Your Email
        </div>
        <h1 className="hh-auth-title">Check your inbox</h1>
        <p className="hh-auth-subtitle">
          We sent a 6-digit verification code to your email address. Enter it below to
          confirm your account.
        </p>
      </div>

      {submitted ? (
        <Alert variant="success" icon="check-circle" className="mb-4">
          Your email has been verified (demo). You can now sign in to your HireHub
          account.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <div
            className="d-flex justify-content-between gap-2 mb-3"
            onPaste={handlePaste}
            aria-label="Verification code"
          >
            {code.map((digit, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                maxLength={2}
                className="hh-auth-code-input"
                value={digit}
                aria-label={`Digit ${index + 1} of 6`}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
              />
            ))}
          </div>

          <Button type="submit" block pill size="lg" icon="shield-check">
            Verify Email
          </Button>
        </form>
      )}

      <div className="hh-auth-footer">
        <p className="mb-0">
          Didn&apos;t get the code?{' '}
          <button
            type="button"
            className="hh-auth-link border-0 bg-transparent p-0"
            onClick={() => {
              setResent(true)
              setSubmitted(false)
            }}
          >
            Resend code
          </button>
        </p>
        {resent && !submitted && (
          <div className="mt-2">
            <Alert variant="info" icon="info-circle" className="mb-0">
              A new verification code has been sent. Check your inbox.
            </Alert>
          </div>
        )}
        <div className="mt-3">
          <Link to="/login" className="hh-auth-link small">
            Back to log in
          </Link>
        </div>
      </div>
    </div>
  )
}