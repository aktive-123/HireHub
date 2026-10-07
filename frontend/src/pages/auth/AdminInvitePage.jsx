import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import Alert from '../../components/ui/Alert'
import { adminInviteApi, apiErrorMessage, apiFieldErrors } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

/**
 * The other half of invite-only admin creation: the page the emailed link
 * opens.
 *
 * There is no session here and cannot be one — the account does not exist
 * until this form succeeds. The token in the route *is* the authorisation, so
 * the page only ever asks for the two things the server actually needs: a name
 * and a password the invitee chooses. Role, status and the verified address
 * are the server's to assign, which is precisely why this form never offers
 * them as fields.
 */
export default function AdminInvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { setSession } = useAuth()

  const [invite, setInvite] = useState(null)
  const [broken, setBroken] = useState(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Resolve the token on mount so the form can show which address the
  // invitation is for — the one detail that tells the visitor this link is
  // theirs before they commit a password to it.
  useEffect(() => {
    let active = true

    adminInviteApi
      .preview(token)
      .then((data) => {
        if (active) setInvite(data)
      })
      .catch((err) => {
        if (active) {
          setBroken(
            apiErrorMessage(err, 'That invitation link is invalid or has expired.')
          )
        }
      })

    return () => {
      active = false
    }
  }, [token])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setFieldErrors({})

    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const payload = await adminInviteApi.accept(token, {
        name: name.trim(),
        password,
        // The API validates with Laravel's `confirmed` rule, which reads this
        // exact key — the client-side match above is only a courtesy check
        // and would pass even if this were omitted, failing at the server.
        password_confirmation: confirm,
      })
      // Exactly what /login stores, so the new admin's first session is
      // indistinguishable from a signed-in one — same keys, same shape.
      setSession(payload)
      navigate('/admin', { replace: true })
    } catch (err) {
      const fields = apiFieldErrors(err)
      if (Object.keys(fields).length > 0) setFieldErrors(fields)

      // The link was spent, revoked or expired between page load and submit
      // (someone else opened it first, or the window closed). Fall back to
      // the broken-link view rather than leaving a form that can never work.
      if (err.status === 404 || err.status === 410) {
        setBroken(apiErrorMessage(err, 'That invitation link is invalid or has expired.'))
      } else {
        setError(
          apiErrorMessage(err, 'Could not finish creating the account. Please try again.')
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (broken) {
    return (
      <div className="hh-auth-card">
        <div className="text-center mb-4">
          <div className="hh-auth-eyebrow justify-content-center">
            <i className="bi bi-person-x" aria-hidden="true" />
            Admin invitation
          </div>
          <h1 className="hh-auth-title">This link will not work</h1>
        </div>

        <Alert variant="danger" className="mb-4">
          {broken}
        </Alert>

        <p className="text-muted small text-center mb-0">
          Ask an administrator to send a new invitation, or sign in if you already
          have an account.
        </p>
      </div>
    )
  }

  if (!invite) {
    return (
      <div className="hh-auth-card">
        <div className="text-center py-4">
          <div className="spinner-border text-primary mb-3" role="status" aria-hidden="true" />
          <p className="text-muted mb-0">Checking your invitation…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="hh-auth-card">
      <div className="text-center mb-4">
        <div className="hh-auth-eyebrow justify-content-center">
          <i className="bi bi-person-badge" aria-hidden="true" />
          Admin invitation
        </div>
        <h1 className="hh-auth-title">Join the admin console</h1>
        <p className="hh-auth-subtitle">
          {invite.inviter ? `${invite.inviter} invited ` : 'This invitation was sent to '}
          <strong>{invite.email}</strong> to help run HireHub. Choose a name and
          password to finish creating the account.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <FormInput
          label="Full name"
          id="invite-name"
          icon="person"
          placeholder="Ada Okafor"
          autoComplete="name"
          required
          error={fieldErrors.name}
          disabled={submitting}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <FormInput
          label="Password"
          id="invite-password"
          type="password"
          icon="lock"
          autoComplete="new-password"
          required
          error={fieldErrors.password}
          disabled={submitting}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <FormInput
          label="Confirm password"
          id="invite-password-confirmation"
          type="password"
          icon="lock"
          autoComplete="new-password"
          required
          disabled={submitting}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />

        <Button type="submit" block pill size="lg" icon="shield-check" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create admin account'}
        </Button>
      </form>

      <div className="hh-auth-footer">
        Already have an account?{' '}
        <Link to="/login" className="hh-auth-link">
          Back to log in
        </Link>
      </div>
    </div>
  )
}
