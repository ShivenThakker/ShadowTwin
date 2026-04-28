import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import useFirebaseAuth from '../../hooks/useFirebaseAuth.js'

function formatTimestamp(timestamp) {
  if (!timestamp) return '—'
  const date = typeof timestamp?.toDate === 'function' ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function exportReport() {
  const data = localStorage.getItem('last_decisions')
  if (!data) {
    alert('Run a demo evaluation first to generate report data.')
    return
  }
  try {
    const parsed = JSON.parse(data)
    const csv = [
      'Field,Value',
      `Bias Severity Score,${parsed.bias_severity_score ?? ''}`,
      `Bias Explanation,${parsed.bias_explanation ?? ''}`,
      `Primary Causal Attribute,${parsed.primary_causal_attribute ?? ''}`,
      `Secondary Causal Attribute,${parsed.secondary_causal_attribute ?? ''}`,
      '',
      'Shadow Results',
      'Attribute,Shadow Value,Decision,Diverged',
      ...(parsed.shadow_results || []).map((r) =>
        `${r.attribute_tested ?? ''},${r.shadow_input_name || r.shadow_postcode || r.shadow_gender || '—'},${r.shadow_decision ?? ''},${r.decision_diverged ?? ''}`
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shadowtwin-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    const blob = new Blob([data], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shadowtwin-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
}

function DashboardLayout() {
  const { signOutUser, user } = useFirebaseAuth()
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-mark"></span>
          <span className="brand-name">Shadow Twin</span>
        </Link>
        <nav className="sidebar-links">
          <NavLink to="/dashboard/decisions">Decisions</NavLink>
          <NavLink to="/dashboard/analytics">Analytics</NavLink>
          <NavLink to="/dashboard/batch-audit">Batch Audit</NavLink>
          <NavLink to="/dashboard/reports/preview">Reports</NavLink>
        </nav>
        <div className="sidebar-status">
          <span className="live-dot"></span>
          Live feed active
        </div>
      </aside>
      <div className="dashboard-content">
        <header className="dashboard-topbar">
          <div>
            <h2>Compliance dashboard</h2>
            <p>Organization: Acme Bank</p>
            <p className="muted">
              {user ? `Signed in as ${user.email}` : 'Sign in to see live data'}
            </p>
          </div>
          <div className="topbar-actions">
            <Link className="btn ghost" to="/demo">
              New test
            </Link>
            {user ? (
              <button className="btn ghost" type="button" onClick={() => setShowSignOutDialog(true)}>
                Sign out
              </button>
            ) : null}
            <button className="btn primary small" type="button" onClick={exportReport}>
              Export report
            </button>
          </div>
        </header>

        {showSignOutDialog && (
          <div className="modal-overlay" onClick={() => setShowSignOutDialog(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Sign out?</h3>
              <p>You'll need to sign in again to access the dashboard.</p>
              <div className="modal-actions">
                <button className="btn ghost" type="button" onClick={() => setShowSignOutDialog(false)}>
                  Cancel
                </button>
                <button className="btn danger" type="button" onClick={async () => {
                  setShowSignOutDialog(false)
                  await signOutUser()
                  navigate('/')
                }}>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
        <Outlet />
      </div>
    </div>
  )
}

export default DashboardLayout
