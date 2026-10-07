import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import whiteLogo from '../assets/white logo.png'

/**
 * Shared frame for the three consoles (job seeker, employer, admin).
 *
 * Below lg the sidebar is an off-canvas drawer: parked off screen, opened by
 * the hamburger in the topbar's top-right corner, and closed by the hamburger,
 * the scrim, Escape, or simply navigating. At lg and up the drawer rules are
 * dropped by the stylesheet and the sidebar is persistent again, so the same
 * markup serves every breakpoint.
 */
export default function DashboardShell({
  portalName,
  navLabel,
  nav,
  sidebarFooter = null,
  topbarStart,
  topbarActions,
  children,
}) {
  const [navOpen, setNavOpen] = useState(false)
  const { pathname } = useLocation()

  // Any navigation — links inside the drawer, a redirect, the back button —
  // closes it. Adjusted during render rather than in an effect so the drawer
  // never paints open over the new page.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setNavOpen(false)
  }

  useEffect(() => {
    if (!navOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    // The drawer overlays the page, so hold the page still behind it.
    const { style } = document.body
    const previousOverflow = style.overflow
    style.overflow = 'hidden'

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      style.overflow = previousOverflow
    }
  }, [navOpen])

  // The drawer only exists below lg. Resizing past that must not strand an
  // open drawer (and its scrim) over a desktop layout.
  useEffect(() => {
    if (!navOpen) return undefined
    const wide = window.matchMedia('(min-width: 992px)')
    const onChange = () => {
      if (wide.matches) setNavOpen(false)
    }
    wide.addEventListener('change', onChange)
    return () => wide.removeEventListener('change', onChange)
  }, [navOpen])

  const closeOnLink = (event) => {
    if (event.target.closest('a')) setNavOpen(false)
  }

  return (
    <div className="hh-dashboard-layout">
      <aside
        id="hh-dashboard-nav"
        className={`hh-dashboard-sidebar${navOpen ? ' is-open' : ''}`}
        onClick={closeOnLink}
      >
        <div className="hh-dashboard-sidebar-header">
          <Link to="/" className="hh-dashboard-brand" aria-label="HireHub home">
            <img src={whiteLogo} alt="HireHub" className="hh-dashboard-brand-logo" />
          </Link>
          <span className="hh-dashboard-brand-sub">{portalName}</span>
        </div>

        <nav className="hh-dashboard-nav" aria-label={navLabel}>
          {nav}
        </nav>

        <div className="p-3 border-top border-secondary">
          <Link to="/" className="hh-dashboard-nav-link text-danger">
            <i className="bi bi-box-arrow-right" aria-hidden="true" />
            <span className="hh-dashboard-nav-label">Exit to Website</span>
          </Link>
          {sidebarFooter}
        </div>
      </aside>

      <div className="hh-dashboard-content">
        <header className={`hh-dashboard-topbar${navOpen ? ' is-nav-open' : ''}`}>
          <div className="hh-dashboard-topbar-start">{topbarStart}</div>
          <div className="hh-dashboard-topbar-actions d-flex align-items-center gap-3">
            {topbarActions}
          </div>
          <button
            type="button"
            className="hh-nav-toggle hh-dashboard-nav-toggle"
            onClick={() => setNavOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={navOpen}
            aria-controls="hh-dashboard-nav"
          >
            <i className={`bi ${navOpen ? 'bi-x-lg' : 'bi-list'}`} aria-hidden="true" />
          </button>
        </header>

        <main className="hh-dashboard-body" id="main-content">
          {children}
        </main>
      </div>

      <div
        className={`hh-dashboard-backdrop${navOpen ? ' is-open' : ''}`}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />
    </div>
  )
}
