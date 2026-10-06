import { useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import FormInput from '../ui/FormInput'
import Alert from '../ui/Alert'
import { authApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

/**
 * The "change password" card, shared by every role that has a settings screen.
 *
 * It was previously written out inline in the seeker and employer pages, which
 * left the admin console with no way to change its own password at all — the one
 * account whose password most needs rotating. Extracted so all three roles get
 * it, and so a future change to the rules lands in one place.
 *
 * Kept as its own <form> rather than nested in a surrounding settings form:
 * nested forms are invalid HTML and browsers drop one of the two submit
 * handlers, so the password form silently stops working.
 */
export default function ChangePasswordCard() {
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  // When an admin reset this account, the flag is what is holding the rest of
  // the app closed, so the card has to explain the situation rather than look
  // like an optional chore.
  const { mustChangePassword, refresh } = useAuth()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setDone(false)

    if (passwords.next !== passwords.confirm) {
      setError('The new password and its confirmation do not match.')
      return
    }

    setBusy(true)
    try {
      await authApi.changePassword({
        current_password: passwords.current,
        password: passwords.next,
        password_confirmation: passwords.confirm,
      })
      // Cleared rather than left filled: the new secret has no business
      // sitting in a React state field after it has been accepted.
      setPasswords({ current: '', next: '', confirm: '' })
      setDone(true)

      // The server cleared must_change_password on the row, but the session
      // still holds the old copy of the user. Without this the client would
      // keep treating the account as confined and refuse to navigate away —
      // the change would appear to have done nothing.
      await refresh().catch(() => {})
    } catch (err) {
      setError(err?.message || 'Could not update your password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="hh-card-body hh-mb-4">
      <div className="hh-card-title-md hh-mb-4">Change password</div>
      {mustChangePassword ? (
        <Alert variant="warning" className="mb-3">
          An administrator reset your password, so you were signed out everywhere and
          your other pages are unavailable until you choose a new one. Sign in again
          elsewhere with the temporary password you were given.
        </Alert>
      ) : null}
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <FormInput
              label="Current password"
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              disabled={busy}
              required
            />
          </div>
          <div className="col-12 col-md-4">
            <FormInput
              label="New password"
              type="password"
              value={passwords.next}
              onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
              disabled={busy}
              helperText="At least 8 characters."
              required
            />
          </div>
          <div className="col-12 col-md-4">
            <FormInput
              label="Confirm new password"
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              disabled={busy}
              required
            />
          </div>
        </div>
        {error ? (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        ) : null}
        {done ? (
          <Alert variant="success" className="mb-3">
            Password updated. Other devices have been signed out.
          </Alert>
        ) : null}
        <Button
          type="submit"
          variant="outline"
          size="sm"
          icon="bi-shield-lock"
          disabled={busy || !passwords.current || !passwords.next}
        >
          {busy ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </Card>
  )
}