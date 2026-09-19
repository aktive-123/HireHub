import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import logoImg from '../../assets/HIREHUBlogo.png'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  return (
    <header className="hh-navbar">
      <div className="page-container">
        <div className="hh-navbar-row">
          <Link to="/" className="hh-navbar-brand">
            <img
              src={logoImg}
              alt="HireHub Logo"
              className="hh-navbar-brand-logo"
            />
          </Link>

          <nav
            className={`hh-navbar-nav-collapse ${mobileMenuOpen ? 'is-open' : ''}`}
            aria-label="Main Navigation"
          >
            <ul className="hh-navbar-nav">
              <li>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `hh-navbar-link ${isActive ? 'hh-navbar-link--active' : ''}`
                  }
                  end
                >
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/jobs"
                  className={({ isActive }) =>
                    `hh-navbar-link ${isActive ? 'hh-navbar-link--active' : ''}`
                  }
                >
                  Find Jobs
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/companies"
                  className={({ isActive }) =>
                    `hh-navbar-link ${isActive ? 'hh-navbar-link--active' : ''}`
                  }
                >
                  Companies
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    `hh-navbar-link ${isActive ? 'hh-navbar-link--active' : ''}`
                  }
                >
                  About
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/resources"
                  className={({ isActive }) =>
                    `hh-navbar-link ${isActive ? 'hh-navbar-link--active' : ''}`
                  }
                >
                  Career Resources
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/contact"
                  className={({ isActive }) =>
                    `hh-navbar-link ${isActive ? 'hh-navbar-link--active' : ''}`
                  }
                >
                  Contact
                </NavLink>
              </li>
            </ul>

            <div className="hh-navbar-actions">
              <Link
                to="/jobs"
                className="hh-navbar-search-btn"
                aria-label="Search jobs"
              >
                <i className="bi bi-search" aria-hidden="true" />
              </Link>
              <Link to="/login" className="hh-btn hh-btn-outline-primary hh-btn-pill">
                Log In
              </Link>
              <Link to="/register/job-seeker" className="hh-btn hh-btn-primary hh-btn-pill">
                Sign Up
              </Link>
            </div>
          </nav>

          <button
            type="button"
            className="hh-nav-toggle"
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <i className={`bi ${mobileMenuOpen ? 'bi-x-lg' : 'bi-list'}`} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}
