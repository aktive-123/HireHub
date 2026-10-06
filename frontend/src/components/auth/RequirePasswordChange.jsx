import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Routes that a user whose password was reset by an admin is still allowed to
// reach. Everything else returns 403 from the API, so this is about giving them
// a usable screen instead of a dead end.
//
// `/login` is deliberately absent: the account is signed out by the reset, and
// signing in again with the temporary password is the normal path back in.
const ALLOWED_PATHS = ['/settings', '/change-password']

/**
 * Confines an account whose password was reset by an admin until they choose a
 * new one.
 *
 * This is a usability guard, not the enforcement. The API refuses every other
 * request independently — a client that skips this gate, a stale tab, or curl
 * gets 403s regardless. That split is intentional: this component keeps people
 * from landing on error pages, and the server keeps the rule true.
 */
export default function RequirePasswordChange({ children }) {
  const { mustChangePassword, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const allowed = ALLOWED_PATHS.some((path) => location.pathname.startsWith(path))

  useEffect(() => {
    // Only redirect once the session is known. During bootstrap the user is
    // still null, and bouncing to the change screen on that would sign out
    // everyone on a slow load.
    if (loading || !mustChangePassword || allowed) return
    navigate('/settings', { replace: true })
  }, [loading, mustChangePassword, allowed, navigate])

  // While redirecting, render nothing rather than the page that will 403.
  if (loading) return null
  if (mustChangePassword && !allowed) return null

  return children
}