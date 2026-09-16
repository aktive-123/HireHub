import { Link, NavLink, Outlet } from 'react-router-dom'
import logoImg from '../assets/hirehub_logo.png'

export default function EmployerLayout() {
  return (
    <div className="hh-dashboard-layout">
      <aside className="hh-dashboard-sidebar">
        <div className="hh-dashboard-sidebar-header">
          <Link to="/">
            <img src={logoImg} alt="HireHub" className="hh-navbar-brand-logo" />
          </Link>
          <div className="mt-2 text-xs text-white-50 small">
            Employer Portal
          </div>
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
            <i className="bi bi-briefcase" /> Job Postings
          </NavLink>
          <NavLink
            to="/employer/jobs/create"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-plus-circle" /> Post a Job
          </NavLink>
          <NavLink
            to="/employer/applicants"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-people" /> All Applicants
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
            <i className="bi bi-calendar-event" /> Interviews
          </NavLink>
          <NavLink
            to="/employer/company"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-building" /> Company Profile
          </NavLink>
          <NavLink
            to="/employer/notifications"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-bell" /> Notifications
          </NavLink>
          <NavLink
            to="/employer/settings"
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
          <div className="fw-semibold text-secondary">Employer Recruiting Center</div>
          <div className="d-flex align-items-center gap-3">
            <Link to="/employer/jobs/create" className="hh-btn hh-btn-primary hh-btn-sm">
              <i className="bi bi-plus" /> New Job
            </Link>
            <span className="hh-badge hh-badge-accent">Employer</span>
          </div>
        </header>

        <main className="hh-dashboard-body" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
