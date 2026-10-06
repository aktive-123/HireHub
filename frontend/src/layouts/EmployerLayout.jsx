import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import RequirePasswordChange from '../components/auth/RequirePasswordChange'
import ErrorBoundary from '../components/common/ErrorBoundary'
import SessionGate from '../components/common/SessionGate'
import PlanUsageIndicator from '../components/employer/PlanUsageIndicator'
import PlanPaywallModal from '../components/employer/PlanPaywallModal'
import UserAvatar from '../components/common/UserAvatar'
import DashboardLogoutButton from '../components/common/DashboardLogoutButton'
import whiteLogo from '../assets/white logo.png'
import { useAuth } from '../context/AuthContext'

export default function EmployerLayout() {
  const { user, role, bootstrapped } = useAuth()
  if (bootstrapped && !user) return <Navigate to="/login" replace state={{ from: '/employer' }} />
  // Same reasoning as the other layouts: a signed-in seeker has no employer
  // endpoints to call, so show their own dashboard instead of an error page.
  if (bootstrapped && role && role !== 'employer') {
    return <Navigate to={role === 'admin' ? '/admin' : '/seeker'} replace />
  }
  if (!bootstrapped) return <SessionGate />
  const userName = user?.name || 'Employer'
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
            <i className="bi bi-speedometer2" />
            <span className="hh-dashboard-nav-label">Dashboard</span>
          </NavLink>
          <NavLink
            to="/employer/jobs"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-briefcase-fill" />
            <span className="hh-dashboard-nav-label">Job Postings</span>
          </NavLink>
          <NavLink
            to="/employer/jobs/create"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-plus-circle-fill" />
            <span className="hh-dashboard-nav-label">Post a Job</span>
          </NavLink>
          <NavLink
            to="/employer/applicants"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-people-fill" />
            <span className="hh-dashboard-nav-label">All Applicants</span>
          </NavLink>
          <NavLink
            to="/employer/tracking"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-kanban" />
            <span className="hh-dashboard-nav-label">ATS Pipeline</span>
          </NavLink>
          <NavLink
            to="/employer/interviews"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-calendar-event-fill" />
            <span className="hh-dashboard-nav-label">Interviews</span>
          </NavLink>
          <NavLink
            to="/employer/company"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-building-fill" />
            <span className="hh-dashboard-nav-label">Company Profile</span>
          </NavLink>
          <NavLink
            to="/employer/notifications"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-bell-fill" />
            <span className="hh-dashboard-nav-label">Notifications</span>
          </NavLink>
          <NavLink
            to="/employer/billing"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-credit-card-2-front-fill" />
            <span className="hh-dashboard-nav-label">Billing &amp; Plan</span>
            <PlanUsageIndicator />
          </NavLink>
          <NavLink
            to="/employer/settings"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-gear-fill" />
            <span className="hh-dashboard-nav-label">Settings</span>
          </NavLink>
        </nav>

        <div className="p-3 border-top border-secondary">
          <Link to="/" className="hh-dashboard-nav-link text-danger">
            <i className="bi bi-box-arrow-right" />
            <span className="hh-dashboard-nav-label">Exit to Website</span>
          </Link>
          <DashboardLogoutButton />
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
              <UserAvatar
                name={userName}
                avatarUrl={user?.avatar_url}
                className="hh-avatar hh-avatar-sm hh-avatar-soft"
              />
              <div className="hh-topbar-user-meta d-none d-xl-block">
                <div className="hh-topbar-user-name">{userName}</div>
                <div className="hh-topbar-user-role">Employer</div>
              </div>
            </div>
            <span className="hh-badge hh-badge-accent">Employer</span>
            <DashboardLogoutButton compact />
          </div>
        </header>

        <main className="hh-dashboard-body" id="main-content">
          <ErrorBoundary>
            <RequirePasswordChange>
              <Outlet />
            </RequirePasswordChange>
          </ErrorBoundary>
          {/* Mounted once for the whole console: any page that hits a plan
              refusal opens the upgrade prompt without knowing this exists. */}
          <PlanPaywallModal />
        </main>
      </div>
    </div>
  )
}
