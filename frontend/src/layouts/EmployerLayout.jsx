import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import whiteLogo from '../assets/white logo.png'
import { useAuth } from '../context/AuthContext'

export default function EmployerLayout() {
  const { user, bootstrapped } = useAuth()
  if (bootstrapped && !user) return <Navigate to="/login" replace state={{ from: '/employer' }} />
  const userName = user?.name || 'Employer'
  const userInitials =
    userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'EM'
  return (
    <div className="hh-dashboard-layout">
      <aside className="hh-dashboard-sidebar">
        <div className="hh-dashboard-sidebar-header">
          <Link to="/" className="hh-dashboard-brand" aria-label="HireHub home">
            <img src={whiteLogo} alt="HireHub" className="hh-dashboard-brand-logo" />
          </Link>
          <span className="hh-dashboard-brand-sub">Employer Portal</span>
        </div>

        <nav className="hh-dashboard-nav" aria-label="Employer Navigation">
          <NavLink
            to="/employer"
            end
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-speedometer2" /> Dashboard
          </NavLink>
          <NavLink
            to="/employer/jobs"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-briefcase-fill" /> Job Postings
          </NavLink>
          <NavLink
            to="/employer/jobs/create"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-plus-circle-fill" /> Post a Job
          </NavLink>
          <NavLink
            to="/employer/applicants"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-people-fill" /> All Applicants
          </NavLink>
          <NavLink
            to="/employer/tracking"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-kanban" /> ATS Pipeline
          </NavLink>
          <NavLink
            to="/employer/interviews"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-calendar-event-fill" /> Interviews
          </NavLink>
          <NavLink
            to="/employer/company"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-building-fill" /> Company Profile
          </NavLink>
          <NavLink
            to="/employer/notifications"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-bell-fill" /> Notifications
          </NavLink>
          <NavLink
            to="/employer/settings"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-gear-fill" /> Settings
          </NavLink>
        </nav>

        <div className="p-3 border-top border-secondary">
          <Link to="/" className="hh-dashboard-nav-link text-danger">
            <i className="bi bi-box-arrow-right" /> Exit to Website
          </Link>
        </div>
      </aside>

      <div className="hh-dashboard-content">
        <header className="hh-dashboard-topbar">
          <div className="fw-semibold text-secondary">Employer Recruiting Center</div>
          <div className="d-flex align-items-center gap-3">
            <Link to="/employer/notifications" className="hh-topbar-icon hh-tip-bottom" data-tooltip="Notifications" aria-label="Notifications">
              <i className="bi bi-bell" aria-hidden="true" />
            </Link>
            <div className="d-flex align-items-center gap-2 hh-topbar-user">
              <span className="hh-avatar hh-avatar-sm hh-avatar-soft" aria-hidden="true">{userInitials}</span>
              <div className="hh-topbar-user-meta d-none d-xl-block">
                <div className="hh-topbar-user-name">{userName}</div>
                <div className="hh-topbar-user-role">Employer</div>
              </div>
            </div>
            <span className="hh-badge hh-badge-accent">Employer</span>
            <Link to="/login" className="hh-topbar-icon hh-tip-bottom hh-tip-end" data-tooltip="Log out" aria-label="Log out">
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </header>

        <main className="hh-dashboard-body" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
