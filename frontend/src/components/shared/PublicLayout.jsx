import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'

function PublicLayout() {
  return (
    <div className="page-shell">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default PublicLayout
