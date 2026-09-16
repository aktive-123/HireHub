import { Link, NavLink, Outlet } from 'react-router-dom'
import logoImg from '../assets/hirehub_logo.png'

export default function SeekerLayout() {
  return (
    <div className="hh-dashboard-layout">
      <aside className="hh-dashboard-sidebar">
        <div className="hh-dashboard-sidebar-header">
          <Link to="/">
            <img src={logoImg} alt="HireHub" className="hh-navbar-brand-logo" />
          </Link>
          <div className="mt-2 text-xs text-white-50 small">
            Job Seeker Portal
          </div>
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
          <div className="fw-semibold text-secondary">Job Seeker Space</div>
          <div className="d-flex align-items-center gap-3">
            <Link to="/seeker/notifications" className="btn btn-light rounded-circle position-relative p-2">
              <i className="bi bi-bell" />
              <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle" />
            </Link>
            <div className="d-flex align-items-center gap-2">
              <span className="hh-badge hh-badge-primary">Job Seeker</span>
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