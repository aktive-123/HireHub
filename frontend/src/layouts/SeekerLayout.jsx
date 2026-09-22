import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import whiteLogo from '../assets/white logo.png'
import { useAuth } from '../context/AuthContext'
import { initials } from '../utils/format'

const PAGE_META = [
  { pattern: /^\/seeker\/applications\/.+/, title: 'Application Details' },
  { pattern: /^\/seeker\/applications$/, title: 'My Applications' },
  { pattern: /^\/seeker\/browse-jobs$/, title: 'Find Jobs' },
  { pattern: /^\/seeker\/saved-jobs$/, title: 'Saved Jobs' },
  { pattern: /^\/seeker\/resume$/, title: 'CV / Resume' },
  { pattern: /^\/seeker\/profile$/, title: 'My Profile' },
  { pattern: /^\/seeker\/edit-profile$/, title: 'Edit Profile' },
  { pattern: /^\/seeker\/notifications$/, title: 'Notifications' },
  { pattern: /^\/seeker\/settings$/, title: 'Settings' },
  { pattern: /^\/seeker$/, title: 'Dashboard' },
]

export default function SeekerLayout() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const meta = PAGE_META.find((m) => m.pattern.test(pathname))
  const title = meta?.title ?? 'Job Seeker Portal'
  const userName = user?.name || 'Job Seeker'

  return (
    <div className="hh-dashboard-layout">
      <aside className="hh-dashboard-sidebar">
        <div className="hh-dashboard-sidebar-header">
          <Link to="/" className="hh-dashboard-brand" aria-label="HireHub home">
            <img src={whiteLogo} alt="HireHub" className="hh-dashboard-brand-logo" />
          </Link>
          <span className="hh-dashboard-brand-sub">Job Seeker Portal</span>
        </div>

        <nav className="hh-dashboard-nav" aria-label="Job Seeker Navigation">
          <NavLink
            to="/seeker"
            end
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-grid-1x2" /> Dashboard
          </NavLink>
          <NavLink
            to="/seeker/browse-jobs"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-search" /> Find Jobs
          </NavLink>
          <NavLink
            to="/seeker/applications"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-briefcase" /> My Applications
          </NavLink>
          <NavLink
            to="/seeker/saved-jobs"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-bookmark" /> Saved Jobs
          </NavLink>
          <NavLink
            to="/seeker/resume"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-file-earmark-person" /> CV / Resume
          </NavLink>
          <NavLink
            to="/seeker/profile"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-person" /> Profile
          </NavLink>
          <NavLink
            to="/seeker/notifications"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-bell" /> Notifications
          </NavLink>
          <NavLink
            to="/seeker/settings"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-gear" /> Settings
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
          <div className="hh-dashboard-page-head">
            <span className="hh-dashboard-page-title">{title}</span>
            <span className="hh-dashboard-breadcrumb">
              HireHub<span className="hh-dashboard-breadcrumb-sep">/</span>
              Job Seeker Portal<span className="hh-dashboard-breadcrumb-sep">/</span>
              {title}
            </span>
          </div>

          <div className="d-flex align-items-center gap-3">
            <Link
              to="/seeker/notifications"
              className="btn btn-light rounded-circle position-relative p-2 hh-tip-bottom"
              data-tooltip="Notifications"
              aria-label="Notifications"
            >
              <i className="bi bi-bell" />
              <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle" />
            </Link>
            <div className="hh-user-chip">
              <span className="hh-avatar hh-avatar-sm hh-avatar-soft" aria-hidden="true">
                {initials(userName)}
              </span>
              <div className="hh-user-chip-meta">
                <span className="hh-user-name">{userName}</span>
                <span className="hh-badge hh-badge-primary hh-badge-sm">Job Seeker</span>
              </div>
            </div>
          </div>
        </header>

        <main className="hh-dashboard-body" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}