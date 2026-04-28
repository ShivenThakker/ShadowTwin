import { Link } from 'react-router-dom'

function Landing() {
  return (
    <div className="landing">
      <section className="hero container">
        <div className="hero-content">
          <span className="eyebrow">Real-time bias detection</span>
          <h1>Your AI is making biased decisions right now. Here is the proof.</h1>
          <p className="lead">
            Shadow Twin runs counterfactual fairness tests on every decision,
            flags the exact attribute that caused harm, and produces an audit
            log that compliance teams can trust.
          </p>
          <div className="hero-actions">
            <Link className="btn primary" to="/demo">
              See it catch bias live
            </Link>
            <Link className="btn ghost" to="/login">
              Sign in
            </Link>
          </div>
          <div className="hero-stats">
            <div>
              <span className="stat">&lt;5s</span>
              <span className="stat-label">evaluation time</span>
            </div>
            <div>
              <span className="stat">0</span>
              <span className="stat-label">model access required</span>
            </div>
            <div>
              <span className="stat">6</span>
              <span className="stat-label">bias dimensions tested</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="orb"></div>
          <div className="hero-card">
            <p className="card-title">Live Decision</p>
            <p className="card-body">Priya Sharma — Loan approval</p>
            <div className="card-row">
              <span className="badge danger">Rejected</span>
              <span className="badge warning">Bias detected</span>
            </div>
          </div>
          <div className="hero-card offset">
            <p className="card-title">Shadow Variant</p>
            <p className="card-body">Alex Johnson — same income</p>
            <div className="card-row">
              <span className="badge success">Approved</span>
              <span className="badge neutral">Name flipped</span>
            </div>
          </div>
        </div>
      </section>

      <section className="steps container">
        <div className="section-header">
          <h2>How it works</h2>
          <p>Every decision is tested in real time, not after damage is done.</p>
        </div>
        <div className="step-grid">
          <div className="step-card">
            <span className="step-number">01</span>
            <h3>Decision arrives</h3>
            <p>Your model returns an approval or rejection.</p>
          </div>
          <div className="step-card">
            <span className="step-number">02</span>
            <h3>Shadow twins generated</h3>
            <p>Protected attributes are neutralized one at a time.</p>
          </div>
          <div className="step-card">
            <span className="step-number">03</span>
            <h3>Outcomes compared</h3>
            <p>We detect flips, causal attributes, and severity.</p>
          </div>
          <div className="step-card">
            <span className="step-number">04</span>
            <h3>Bias flagged</h3>
            <p>Plain-language explanation and audit log delivered.</p>
          </div>
        </div>
      </section>

      <section className="difference container">
        <div className="section-header">
          <h2>Why it is different</h2>
          <p>Dataset audits are too late. Shadow Twin catches bias on the first decision.</p>
        </div>
        <div className="difference-grid">
          <div className="difference-card muted">
            <h3>Traditional auditing</h3>
            <ul>
              <li>Runs after thousands of decisions</li>
              <li>Needs model access and training data</li>
              <li>Delivers population statistics only</li>
            </ul>
          </div>
          <div className="difference-card highlight">
            <h3>Shadow Twin</h3>
            <ul>
              <li>Runs at the moment of decision</li>
              <li>Works as a black-box wrapper</li>
              <li>Explains individual harm with evidence</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="cta container">
        <div className="cta-card">
          <div>
            <h2>Show the judges a bias detection that is impossible to miss.</h2>
            <p>Launch the live demo and watch the decision flip in seconds.</p>
          </div>
          <Link className="btn primary" to="/demo">
            Run the demo
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Landing
