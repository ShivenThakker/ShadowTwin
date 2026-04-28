import { Link } from 'react-router-dom'
import useFirebaseAuth from '../hooks/useFirebaseAuth.js'

function Login() {
  const { error, loading, signIn, signOutUser, user } = useFirebaseAuth()

  return (
    <div className="login container">
      <section className="panel login-panel">
        <h1>Sign in to access your bias dashboard</h1>
        <p>Secure Google Sign-In for compliance teams.</p>
        {user ? (
          <div className="status-block">
            <p className="muted">Signed in as {user.email}</p>
            <div className="panel-actions">
              <Link className="btn primary" to="/dashboard/decisions">
                Go to dashboard
              </Link>
              <button className="btn ghost" type="button" onClick={signOutUser}>
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <button className="btn primary" type="button" onClick={signIn} disabled={loading}>
            {loading ? 'Connecting...' : 'Sign in with Google'}
          </button>
        )}
        {error ? <p className="error-text">{error.message}</p> : null}
        <div className="divider">or</div>
        <Link className="btn ghost" to="/demo">
          Try the demo without login
        </Link>
      </section>
    </div>
  )
}

export default Login
