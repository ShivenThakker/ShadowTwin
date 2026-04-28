import { useParams } from 'react-router-dom'
import useDecisionReport from '../../hooks/useDecisionReport.js'
import useReportPdf from '../../hooks/useReportPdf.js'

function Report() {
  const { id } = useParams()
  const { data, error, loading } = useDecisionReport(id)
  const { downloadPdf, loading: pdfLoading } = useReportPdf()

  if (loading) {
    return (
      <section className="panel report">
        <p>Loading report...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel report">
        <p>Unable to load this report.</p>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="panel report">
        <p>No report found for this decision.</p>
      </section>
    )
  }

  const shadowResults = Array.isArray(data.shadow_results) ? data.shadow_results : []

  return (
    <section className="panel report">
      <div className="panel-header">
        <h2>Audit report #{data.audit_log_id || data.id}</h2>
        <button className="btn ghost" type="button" onClick={() => downloadPdf(data)} disabled={pdfLoading}>
          {pdfLoading ? 'Generating...' : 'Download PDF'}
        </button>
      </div>
      <div className="report-grid">
        <div>
          <h3>Decision summary</h3>
          <ul>
            <li>Category: {data.decision_category || '—'}</li>
            <li>Outcome: {data.original_decision?.outcome || '—'}</li>
            <li>Bias detected: {data.bias_detected ? 'Yes' : 'No'}</li>
            <li>Severity: {data.bias_severity_score || '—'} / 100</li>
          </ul>
        </div>
        <div>
          <h3>Causal attributes</h3>
          <ul>
            <li>{data.primary_causal_attribute || '—'}</li>
            <li>{data.secondary_causal_attribute || '—'}</li>
          </ul>
        </div>
      </div>
      <div className="panel inset">
        <h3>Shadow comparison table</h3>
        <div className="table">
          <div className="table-row header">
            <span>Attribute</span>
            <span>Shadow</span>
            <span>Decision</span>
            <span>Result</span>
          </div>
          {shadowResults.length === 0 ? (
            <div className="empty-state">No shadow results available.</div>
          ) : (
            shadowResults.map((result, index) => (
              <div className="table-row" key={`${result.attribute_tested}-${index}`}>
                <span>{result.attribute_tested}</span>
                <span>
                  {result.shadow_input_name ||
                    result.shadow_postcode ||
                    result.shadow_gender ||
                    result.shadow_location ||
                    result.shadow_university_tier ||
                    result.shadow_employment_gap_months ||
                    '—'}
                </span>
                <span>{result.shadow_decision}</span>
                <span className={`badge ${result.decision_diverged ? 'danger' : 'success'}`}>
                  {result.decision_diverged ? 'Flip' : 'Same'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

export default Report
