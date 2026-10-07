import { useState } from 'react'
import Card from '../ui/Card'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import FormInput from '../ui/FormInput'
import DataTable from '../ui/DataTable'
import EmptyState from '../ui/EmptyState'
import { adminApi, apiErrorMessage, apiFieldErrors } from '../../services/api'
import { useAdminList } from '../../hooks/useAdminData'

/**
 * Issue, hand over and revoke invitations to the admin console.
 *
 * The card deliberately never shows a token or a hash. What it can show, once
 * and only once, is the link returned by the issue request — after that the
 * server holds only the sha256 of the token, so a re-fetch cannot recover it
 * and the copy action exists while the result is still on screen. That is the
 * trade the API makes (a database dump cannot be replayed as live admin
 * links), and the UI is shaped around it rather than fighting it.
 */
export default function AdminInvitationsCard() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState(null)
  const [invited, setInvited] = useState(null)
  const [revokingId, setRevokingId] = useState(null)

  const { items, refetch } = useAdminList(() => adminApi.invitations(), [], [])

  const handleInvite = async (event) => {
    event.preventDefault()
    const address = email.trim()
    if (!address) {
      setNotice({ type: 'danger', message: 'Enter the email address to invite.' })
      return
    }

    setSending(true)
    setNotice(null)

    try {
      const res = await adminApi.inviteAdmin(address)
      setInvited({ email: res.invitation.email, url: res.invite_url })
      setEmail('')
      setNotice({
        type: res.notification_sent ? 'success' : 'warning',
        message: res.notification_sent
          ? `Invitation sent to ${res.invitation.email}.`
          : 'The invitation was created, but the email could not be sent. Copy the link below and share it yourself.',
      })
      refetch()
    } catch (err) {
      setNotice({
        type: 'danger',
        message: apiFieldErrors(err).email ||
          apiErrorMessage(err, 'Could not send the invitation. Please try again.'),
      })
    } finally {
      setSending(false)
    }
  }

  const copyLink = async () => {
    if (!invited) return
    try {
      await navigator.clipboard.writeText(invited.url)
      setNotice({ type: 'success', message: 'Invitation link copied to your clipboard.' })
    } catch {
      // Clipboard access can be denied or unavailable outside a secure
      // context. The link is already visible in the field, so the fallback
      // is simply to say so rather than to fail silently.
      setNotice({ type: 'warning', message: 'Copy the link from the field above.' })
    }
  }

  const handleRevoke = async (invitation) => {
    const confirmed = window.confirm(
      `Revoke the invitation for ${invitation.email}?\n\nThe link stops working immediately and a new invitation would be needed.`
    )
    if (!confirmed) return

    setRevokingId(invitation.id)
    setNotice(null)
    try {
      await adminApi.revokeInvitation(invitation.id)
      setNotice({ type: 'success', message: `The invitation for ${invitation.email} was revoked.` })
      if (invited?.email === invitation.email) setInvited(null)
      refetch()
    } catch (err) {
      setNotice({
        type: 'danger',
        message: apiErrorMessage(err, 'Could not revoke that invitation.'),
      })
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <>
      <Card className="hh-card-body hh-mt-5">
        <h3 className="hh-card-title-md hh-mb-1">Admin invitations</h3>
        <p className="text-muted small hh-mb-0">
          Invite a colleague by email. They set their own password through a single-use
          link that expires in 7 days — nobody can register as an admin themselves.
        </p>

        {notice ? (
          <div className="mt-3">
            <Alert variant={notice.type} dismissible onDismiss={() => setNotice(null)}>
              {notice.message}
            </Alert>
          </div>
        ) : null}

        {invited ? (
          <div className="mt-3 p-3 rounded-3 bg-light border">
            <p className="small fw-semibold mb-2">
              Invitation link for {invited.email}
            </p>
            <div className="d-flex flex-column flex-sm-row gap-2">
              <input
                className="form-control form-control-sm"
                readOnly
                value={invited.url}
                aria-label="Invitation link"
                onFocus={(event) => event.target.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon="clipboard"
                onClick={copyLink}
                className="flex-shrink-0"
              >
                Copy link
              </Button>
            </div>
            <p className="small text-muted mb-0 mt-2">
              Shown once. The server keeps only a hash of this token, so it cannot be
              recovered later — share it now or send a fresh invitation.
            </p>
          </div>
        ) : null}

        <form onSubmit={handleInvite} noValidate className="mt-3">
          <FormInput
            label="Email address"
            id="admin-invite-email"
            type="email"
            icon="envelope"
            placeholder="colleague@example.com"
            autoComplete="email"
            required
            disabled={sending}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" pill icon="person-plus" disabled={sending || !email.trim()}>
            {sending ? 'Sending…' : 'Send invitation'}
          </Button>
        </form>
      </Card>

      {items.length > 0 ? (
        <Card className="hh-card-body hh-p-0 hh-card--table">
          <DataTable
            zebra
            columns={[
              { key: 'email', label: 'Invited address' },
              { key: 'invited_by', label: 'Invited by' },
              { key: 'invited', label: 'Sent' },
              { key: 'expires', label: 'Expires' },
              { key: 'actions', label: 'Actions', align: 'right' },
            ]}
            rows={items.map((invitation) => ({
              id: invitation.id,
              email: <span className="fw-semibold">{invitation.email}</span>,
              invited_by: invitation.invited_by ?? '—',
              invited: invitation.invited,
              expires: invitation.expires,
              actions: (
                <div className="d-flex justify-content-end">
                  <button
                    type="button"
                    className="hh-icon-btn hh-icon-btn-danger"
                    data-tooltip="Revoke invitation"
                    aria-label={`Revoke invitation for ${invitation.email}`}
                    disabled={revokingId === invitation.id}
                    onClick={() => handleRevoke(invitation)}
                  >
                    <i className="bi bi-x-circle" aria-hidden="true" />
                  </button>
                </div>
              ),
            }))}
            rowKey={(row) => row.id}
          />
        </Card>
      ) : (
        <div className="hh-mt-3">
          <EmptyState
            icon="person-plus"
            title="No pending invitations"
            text="Invitations you send stay listed here until they are used, expire or are revoked."
          />
        </div>
      )}
    </>
  )
}
