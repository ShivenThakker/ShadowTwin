import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import useShadowEval from '../hooks/useShadowEval.js'

const defaultLoan = {
  applicant_name: 'Priya Sharma',
  age: 28,
  gender: 'female',
  city: 'Mumbai',
  postcode: '400017',
  annual_income_inr: 420000,
  employment_status: 'salaried',
  loan_amount_requested_inr: 500000,
  credit_score: 710,
  additional_context: 'First-time applicant, no prior loan history',
}

const defaultJob = {
  applicant_name: 'Aisha Khan',
  gender: 'female',
  location: 'Bengaluru',
  university_tier: 'tier_2',
  employment_gap_months: 14,
  job_description:
    'Hiring a data analyst with SQL, Python, dashboards, and 3+ years of experience.',
  resume_text:
    'SQL, Python, Tableau, 4 years analytics experience, built dashboards for retail.',
  additional_context: 'Strong portfolio but career gap due to caregiving.',
}

function formatAttr(str) {
  if (!str) return '—'
  // lowercase first letter, replace underscores with spaces
  return str.replace(/_/g, ' ').replace(/^[A-Z]/, (c) => c.toLowerCase())
}

function formatAttrValue(val) {
  if (val === undefined || val === null || val === '') return null
  return String(val)
}

function Demo() {
  const [scenario, setScenario] = useState('loan')
  const [loanInput, setLoanInput] = useState(defaultLoan)
  const [jobInput, setJobInput] = useState(defaultJob)
  const { data, error, evaluate, loading, reset } = useShadowEval()

  const title = scenario === 'loan' ? 'Loan Application Bias Detector' : 'Job Application Bias Detector'
  const decisionCategory = scenario === 'loan' ? 'loan_application' : 'job_application'
  const activeInput = scenario === 'loan' ? loanInput : jobInput

  const shadowRows = useMemo(() => {
    if (!data?.shadow_results) return []
    return data.shadow_results.map((result, index) => ({
      key: `${result.attribute_tested}-${index}`,
      attribute: formatAttr(result.attribute_tested),
      shadowValue:
        formatAttrValue(result.shadow_input_name) ||
        formatAttrValue(result.shadow_postcode) ||
        formatAttrValue(result.shadow_gender) ||
        formatAttrValue(result.shadow_location) ||
        formatAttrValue(result.shadow_university_tier) ||
        formatAttrValue(result.shadow_employment_gap_months) ||
        '—',
      decision: result.shadow_decision,
      diverged: result.decision_diverged,
    }))
  }, [data])

  const updateLoan = (field, value) => setLoanInput((prev) => ({ ...prev, [field]: value }))
  const updateJob = (field, value) => setJobInput((prev) => ({ ...prev, [field]: value }))

  const submitDemo = async () => {
    const payload = {
      decision_category: decisionCategory,
      input: activeInput,
    }
    await evaluate(payload)
  }

  return (
    <div className="demo container">
      <div className="demo-header">
        <div>
          <h1>Live Demo — {title}</h1>
          <p>Pre-filled with a synthetic applicant designed to surface bias in seconds.</p>
        </div>
        <Link className="btn ghost" to="/login">
          Sign in for dashboard
        </Link>
      </div>

      <div className="demo-tabs">
        <button
          type="button"
          className={`toggle ${scenario === 'loan' ? 'active' : ''}`}
          onClick={() => {
            setScenario('loan')
            reset()
          }}
        >
          Loan application
        </button>
        <button
          type="button"
          className={`toggle ${scenario === 'job' ? 'active' : ''}`}
          onClick={() => {
            setScenario('job')
            reset()
          }}
        >
          Job application
        </button>
      </div>

      <div className="demo-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Step 1: Submit an application</h2>
            <span className="badge neutral">No login required</span>
          </div>
          {scenario === 'loan' ? (
            <form className="form-grid">
              <label>
                Name
                <input
                  value={loanInput.applicant_name}
                  onChange={(event) => updateLoan('applicant_name', event.target.value)}
                />
              </label>
              <label>
                Age
                <input
                  type="number"
                  value={loanInput.age}
                  onChange={(event) => updateLoan('age', Number(event.target.value))}
                />
              </label>
              <label>
                Gender
                <select
                  value={loanInput.gender}
                  onChange={(event) => updateLoan('gender', event.target.value)}
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="nonbinary">Non-binary</option>
                </select>
              </label>
              <label>
                City
                <input value={loanInput.city} onChange={(event) => updateLoan('city', event.target.value)} />
              </label>
              <label>
                Postcode
                <input
                  value={loanInput.postcode}
                  onChange={(event) => updateLoan('postcode', event.target.value)}
                />
              </label>
              <label>
                Annual income (INR)
                <input
                  type="number"
                  value={loanInput.annual_income_inr}
                  onChange={(event) => updateLoan('annual_income_inr', Number(event.target.value))}
                />
              </label>
              <label>
                Credit score
                <input
                  type="number"
                  value={loanInput.credit_score}
                  onChange={(event) => updateLoan('credit_score', Number(event.target.value))}
                />
              </label>
              <label>
                Loan amount (INR)
                <input
                  type="number"
                  value={loanInput.loan_amount_requested_inr}
                  onChange={(event) =>
                    updateLoan('loan_amount_requested_inr', Number(event.target.value))
                  }
                />
              </label>
            </form>
          ) : (
            <form className="form-grid">
              <label>
                Name
                <input
                  value={jobInput.applicant_name}
                  onChange={(event) => updateJob('applicant_name', event.target.value)}
                />
              </label>
              <label>
                Gender
                <select
                  value={jobInput.gender}
                  onChange={(event) => updateJob('gender', event.target.value)}
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="nonbinary">Non-binary</option>
                </select>
              </label>
              <label>
                Location
                <input
                  value={jobInput.location}
                  onChange={(event) => updateJob('location', event.target.value)}
                />
              </label>
              <label>
                University tier
                <select
                  value={jobInput.university_tier}
                  onChange={(event) => updateJob('university_tier', event.target.value)}
                >
                  <option value="tier_1">Tier 1</option>
                  <option value="tier_2">Tier 2</option>
                  <option value="tier_3">Tier 3</option>
                </select>
              </label>
              <label>
                Employment gap (months)
                <input
                  type="number"
                  value={jobInput.employment_gap_months}
                  onChange={(event) => updateJob('employment_gap_months', Number(event.target.value))}
                />
              </label>
              <label>
                Job description
                <textarea
                  value={jobInput.job_description}
                  onChange={(event) => updateJob('job_description', event.target.value)}
                />
              </label>
              <label>
                Resume text
                <textarea
                  value={jobInput.resume_text}
                  onChange={(event) => updateJob('resume_text', event.target.value)}
                />
              </label>
            </form>
          )}
          <div className="panel-actions">
            <button className="btn primary" type="button" onClick={submitDemo} disabled={loading}>
              {loading ? 'Evaluating...' : 'Submit to AI decision system'}
            </button>
            <button className="btn ghost" type="button" onClick={reset}>
              Reset
            </button>
          </div>
          {error ? (
            <p className="error-text">
              {error.message.includes('localhost:8080')
                ? 'Backend not running. Start it with: cd backend && source venv/bin/activate && python -m uvicorn main:app --reload'
                : error.message}
            </p>
          ) : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Live evaluation pipeline</h2>
            <span className={`badge ${loading ? 'warning' : 'neutral'}`}>
              {loading ? 'Processing' : 'Ready'}
            </span>
          </div>
          <div className="pipeline">
            <div className={`pipeline-item ${loading ? 'active' : ''}`}>
              <span className="dot"></span>
              Extracting attributes
            </div>
            <div className={`pipeline-item ${loading ? 'active' : ''}`}>
              <span className="dot"></span>
              Building shadow variants
            </div>
            <div className={`pipeline-item ${loading ? 'active' : ''}`}>
              <span className="dot"></span>
              Running comparisons
            </div>
            <div className={`pipeline-item ${loading ? 'active' : ''}`}>
              <span className="dot"></span>
              Analyzing results
            </div>
          </div>

          {data ? (
            <div className="explain">
              <h3>
                Bias detected — Severity {data.bias_severity_score} / 100
              </h3>
              <p>{data.bias_explanation}</p>
              <div className="result-preview">
                <div>
                  <p className="card-title">Primary cause</p>
                  <span className="badge danger">{formatAttr(data.primary_causal_attribute)}</span>
                </div>
                <div>
                  <p className="card-title">Secondary cause</p>
                  <span className="badge warning">{formatAttr(data.secondary_causal_attribute)}</span>
                </div>
              </div>
              <div className="panel inset">
                <h3>Shadow comparison</h3>
                <div className="table">
                  <div className="table-row header">
                    <span>Attribute</span>
                    <span>Shadow</span>
                    <span>Decision</span>
                    <span>Result</span>
                  </div>
                  {shadowRows.map((row) => (
                    <div className="table-row" key={row.key}>
                      <span>{row.attribute}</span>
                      <span>{row.shadowValue}</span>
                      <span>{row.decision}</span>
                      <span className={`badge ${row.diverged ? 'danger' : 'success'}`}>
                        {row.diverged ? 'Flip' : 'Same'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="result-preview">
              <div>
                <p className="card-title">Original decision</p>
                <span className="badge neutral">Pending</span>
              </div>
              <div>
                <p className="card-title">Shadow decision</p>
                <span className="badge neutral">Pending</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Demo
