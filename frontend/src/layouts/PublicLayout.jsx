import { Outlet } from 'react-router-dom'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'

export default function PublicLayout() {
  return (
    <div className="hh-app-wrapper">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className="hh-main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}