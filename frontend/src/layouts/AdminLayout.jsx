import { Link, NavLink, Outlet } from 'react-router-dom'
import whiteLogo from '../assets/white logo.png'
import AdminNotificationBell from '../components/admin/AdminNotificationBell'

export default function AdminLayout() {
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
          <div className="fw-semibold text-secondary">Superadmin Control Center</div>
          <div className="d-flex align-items-center gap-3">
            <AdminNotificationBell />
            <div className="d-flex align-items-center gap-2 hh-topbar-user">
              <span className="hh-avatar hh-avatar-sm hh-avatar-soft" aria-hidden="true">
                SB
              </span>
              <div className="hh-topbar-user-meta d-none d-xxl-block">
                <div className="hh-topbar-user-name">Sarah Bello</div>
                <div className="hh-topbar-user-role">Super Admin</div>
              </div>
            </div>
            <Link to="/login" className="hh-topbar-icon hh-tip-bottom hh-tip-end" data-tooltip="Log out" aria-label="Log out">
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
            </Link>
            <span className="hh-badge hh-badge-accent">Admin Mode</span>
          </div>
        </header>

        <main className="hh-dashboard-body" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
