import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import whiteLogo from '../assets/white logo.png'
import AdminNotificationBell from '../components/admin/AdminNotificationBell'
import ErrorBoundary from '../components/common/ErrorBoundary'
import SessionGate from '../components/common/SessionGate'
import UserAvatar from '../components/common/UserAvatar'
import DashboardLogoutButton from '../components/common/DashboardLogoutButton'
import { useAuth } from '../context/AuthContext'

export default function AdminLayout() {
  const { user, role, bootstrapped } = useAuth()

  // Without this the whole admin area rendered for anonymous visitors and then
  // filled with 401 error panels, because nothing checked the session first.
  if (bootstrapped && !user) return <Navigate to="/login" replace state={{ from: '/admin' }} />
  // Signed in, but not as an admin. Send them to their own dashboard rather
  // than a login screen they are already authenticated for.
  if (bootstrapped && role && role !== 'admin') {
    return <Navigate to={role === 'employer' ? '/employer' : '/seeker'} replace />
  }
  if (!bootstrapped) return <SessionGate />

  return (
    <div className="hh-dashboard-layout">
      <aside className="hh-dashboard-sidebar">
        <div className="hh-dashboard-sidebar-header">
          <Link to="/" className="hh-dashboard-brand" aria-label="HireHub home">
            <img src={whiteLogo} alt="HireHub" className="hh-dashboard-brand-logo" />
          </Link>
          <span className="hh-dashboard-brand-sub">System Administration</span>
        </div>

        <nav className="hh-dashboard-nav" aria-label="Admin Navigation">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-shield-fill" /> Admin Overview
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-people-fill" /> All Users
          </NavLink>
          <NavLink
            to="/admin/job-seekers"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-person-badge-fill" /> Job Seekers
          </NavLink>
          <NavLink
            to="/admin/employers"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-briefcase-fill" /> Employers
          </NavLink>
          <NavLink
            to="/admin/companies"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-buildings-fill" /> Companies
          </NavLink>
          <NavLink
            to="/admin/jobs"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-file-earmark-text-fill" /> Moderated Jobs
          </NavLink>
          <NavLink
            to="/admin/applications"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-inbox-fill" /> Applications
          </NavLink>
          <NavLink
            to="/admin/categories"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-tags-fill" /> Categories
          </NavLink>
          <NavLink
            to="/admin/skills"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-cpu-fill" /> Skills
          </NavLink>
          <NavLink
            to="/admin/reports"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-graph-up" /> Reports
          </NavLink>
          <NavLink
            to="/admin/hiring-fees"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-cash-coin" /> Hiring Fees
          </NavLink>
          <NavLink
            to="/admin/activity-logs"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-journal-text" /> Activity Logs
          </NavLink>
          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-sliders" /> Platform Settings
          </NavLink>
        </nav>

        <div className="p-3 border-top border-secondary">
          <Link to="/" className="hh-dashboard-nav-link text-danger">
            <i className="bi bi-box-arrow-right" /> Exit to Website
          </Link>
          <DashboardLogoutButton />
        </div>
      </aside>

      <div className="hh-dashboard-content">
        <header className="hh-dashboard-topbar">
          <div className="fw-semibold text-secondary">Superadmin Control Center</div>
          <div className="d-flex align-items-center gap-3">
            <AdminNotificationBell />
            <div className="d-flex align-items-center gap-2 hh-topbar-user">
              <UserAvatar
                name={user?.name}
                avatarUrl={user?.avatar_url}
                className="hh-avatar hh-avatar-sm hh-avatar-soft"
              />
              <div className="hh-topbar-user-meta d-none d-xxl-block">
                <div className="hh-topbar-user-name">{user?.name || 'Administrator'}</div>
                <div className="hh-topbar-user-role">Super Admin</div>
              </div>
            </div>
            <DashboardLogoutButton compact />
            <span className="hh-badge hh-badge-accent">Admin Mode</span>
          </div>
        </header>

        <main className="hh-dashboard-body" id="main-content">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
