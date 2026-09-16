import { Link, NavLink, Outlet } from 'react-router-dom'
import logoImg from '../assets/hirehub_logo.png'

export default function AdminLayout() {
  return (
    <div className="hh-dashboard-layout">
      <aside className="hh-dashboard-sidebar">
        <div className="hh-dashboard-sidebar-header">
          <Link to="/">
            <img src={logoImg} alt="HireHub" className="hh-navbar-brand-logo" />
          </Link>
          <div className="mt-2 text-xs text-white-50 small">
            System Administration
          </div>
        </div>

        <nav className="hh-dashboard-nav" aria-label="Admin Navigation">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-shield-check" /> Admin Overview
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-people" /> All Users
          </NavLink>
          <NavLink
            to="/admin/job-seekers"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-person-badge" /> Job Seekers
          </NavLink>
          <NavLink
            to="/admin/employers"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-briefcase" /> Employers
          </NavLink>
          <NavLink
            to="/admin/companies"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-buildings" /> Companies
          </NavLink>
          <NavLink
            to="/admin/jobs"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-file-earmark-text" /> Moderated Jobs
          </NavLink>
          <NavLink
            to="/admin/applications"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-inbox" /> Applications
          </NavLink>
          <NavLink
            to="/admin/categories"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-tags" /> Categories
          </NavLink>
          <NavLink
            to="/admin/skills"
            className={({ isActive }) =>
              `hh-dashboard-nav-link ${isActive ? 'hh-dashboard-nav-link--active' : ''}`
            }
          >
            <i className="bi bi-cpu" /> Skills
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
        </div>
      </aside>

      <div className="hh-dashboard-content">
        <header className="hh-dashboard-topbar">
          <div className="fw-semibold text-danger">Superadmin Control Center</div>
          <div className="d-flex align-items-center gap-3">
            <span className="hh-badge hh-badge-danger">Admin Mode</span>
          </div>
        </header>

        <main className="hh-dashboard-body" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
