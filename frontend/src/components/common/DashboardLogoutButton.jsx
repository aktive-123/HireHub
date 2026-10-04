import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function DashboardLogoutButton({ compact = false }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  if (compact) {
    return (
      <button
        type="button"
        className="hh-topbar-icon hh-tip-bottom hh-tip-end border-0 bg-transparent"
        data-tooltip="Log out"
        aria-label="Log out"
        onClick={handleLogout}
      >
        <i className="bi bi-box-arrow-right" aria-hidden="true" />
      </button>
    )
  }

  return (
    <button
      type="button"
      className="hh-dashboard-nav-link text-danger w-100 border-0 bg-transparent text-start"
      onClick={handleLogout}
    >
      <i className="bi bi-box-arrow-right" aria-hidden="true" />
      <span className="hh-dashboard-nav-label">Log out</span>
    </button>
  )
}
