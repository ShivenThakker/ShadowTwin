import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useFirebaseAuth from '../../hooks/useFirebaseAuth.js'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, signOutUser } = useFirebaseAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOutUser()
    setMenuOpen(false)
    navigate('/')
  }

  const handleDashboardClick = () => {
    setMenuOpen(false)
    navigate('/dashboard')
  }

  return (
    <>
      <header className="nav">
        <div className="nav-inner container">
          <Link to="/" className="brand">
            <span className="brand-mark"></span>
            <span className="brand-name">Shadow Twin</span>
          </Link>

          {/* Hamburger menu button */}
          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Open menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      {/* Overlay */}
      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)} />
      )}

      {/* Mobile Menu */}
      <nav className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <button
          className="mobile-menu-close"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        >
          ×
        </button>

        <div className="mobile-menu-content">
          {user ? (
            <>
              <div className="mobile-menu-user">
                <span className="user-email">{user.email}</span>
              </div>
              <button className="mobile-menu-btn" onClick={handleDashboardClick}>
                Dashboard
              </button>
            </>
          ) : (
            <button
              className="mobile-menu-btn primary"
              onClick={() => {
                setMenuOpen(false)
                navigate('/login')
              }}
            >
              Sign in
            </button>
          )}
        </div>

        {user && (
          <div className="mobile-menu-footer">
            <button className="mobile-menu-btn signout" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        )}
      </nav>
    </>
  )
}

export default Navbar
