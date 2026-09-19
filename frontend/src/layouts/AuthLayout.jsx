import { Link, Outlet } from 'react-router-dom'
import logoImg from '../assets/HIREHUBlogo.png'

export default function AuthLayout() {
  return (
    <div className="hh-auth-wrapper">
      <div className="w-100 d-flex flex-column align-items-center">
        <Link to="/" className="mb-4 d-inline-block">
          <img
            src={logoImg}
            alt="HireHub Logo"
            className="hh-navbar-brand-logo"
          />
        </Link>
        <main id="main-content" className="w-100 d-flex justify-content-center">
          <Outlet />
        </main>
        <div className="mt-4 text-center">
          <Link to="/" className="hh-footer-link text-muted small">
            <i className="bi bi-arrow-left me-1" /> Back to HireHub Home
          </Link>
        </div>
      </div>
    </div>
  )
}