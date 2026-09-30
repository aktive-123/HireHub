import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { useAuth } from '../../context/AuthContext'

/**
 * Account security panel shared by the seeker and employer settings screens.
 *
 * It is the same control in both consoles, so it lives in one component rather
 * than being copy-pasted into each settings page.
 */
export default function SessionSecurityCard({ className = '' }) {
  const { logoutAll } = useAuth()
  const navigate = useNavigate()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleSignOutEverywhere = async () => {
    setBusy(true)
    setError('')

    try {
      await logoutAll()
      navigate('/login', { replace: true })
    } catch {
      setError('We could not reach the server. Check your connection and try again.')
      setBusy(false)
    }
  }

  return (
    <Card className={`hh-card-body hh-mb-4 ${className}`}>
      <div className="hh-danger-zone">
        <h3 className="hh-danger-zone-title">Active sessions</h3>
        <p>
          Signed in on a device you don&apos;t recognise? Signing out everywhere ends every
          session on your account, including this one, and you will need to sign in
          again.
        </p>

        {error && (
          <p className="text-danger mb-2" role="alert">
            {error}
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          icon="box-arrow-right"
          className="hh-btn-danger-outline"
          onClick={handleSignOutEverywhere}
          disabled={busy}
        >
          {busy ? 'Signing out…' : 'Sign out of all devices'}
        </Button>
      </div>
    </Card>
  )
}
