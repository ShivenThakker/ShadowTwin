import { useState } from 'react'
import useBatchAudit from '../../hooks/useBatchAudit.js'

function BatchAudit() {
  const [datasetType, setDatasetType] = useState('loan')
  const [file, setFile] = useState(null)
  const { data, downloadPdf, error, loading, runAudit, reset } = useBatchAudit()

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!file) return
    await runAudit(file, datasetType)
  }

  return (
    <section className="panel batch-audit">
      <div className="panel-header">
        <div>
          <h2>Batch Bias Audit</h2>
          <p>Upload CSV files to detect bias patterns across many decisions.</p>
        </div>
        <button className="btn ghost" type="button" onClick={reset}>
          Clear
        </button>
      </div>
      <form className="batch-form" onSubmit={handleSubmit}>
        <div className="field">
          <label>Dataset type</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle ${datasetType === 'loan' ? 'active' : ''}`}
              onClick={() => setDatasetType('loan')}
            >
              Loan applications
            </button>
            <button
              type="button"
              className={`toggle ${datasetType === 'job' ? 'active' : ''}`}
              onClick={() => setDatasetType('job')}
            >
              Job applications
            </button>
          </div>
        </div>
        <div className="field">
          <label>CSV file</label>
          <input
            type="file"
            accept=".csv"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </div>
        <button className="btn primary" type="submit" disabled={loading || !file}>
          {loading ? 'Analyzing...' : 'Run audit'}
        </button>
      </form>

      {error ? <p className="error-text">{error.message}</p> : null}

      {data ? (
        <div className="batch-results">
          <div className="batch-summary">
            <div>
              <p className="card-title">Fairness score</p>
              <h3>{data.fairness_score}</h3>
            </div>
            <div>
              <p className="card-title">Biased fields</p>
              <p>{data.biased_fields?.join(', ') || 'None detected'}</p>
            </div>
          </div>
          <div className="panel inset">
            <h3>Flagged rows</h3>
            {data.flagged_rows?.length ? (
              <ul>
                {data.flagged_rows.map((row, index) => (
                  <li key={`${row.row}-${index}`}>
                    Row {row.row}: {row.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No rows flagged.</p>
            )}
          </div>
          <div className="panel inset">
            <h3>Summary</h3>
            <p>{data.summary}</p>
          </div>
          <button className="btn ghost" type="button" onClick={() => downloadPdf(data)}>
            Download PDF
          </button>
        </div>
      ) : null}
    </section>
  )
}

export default BatchAudit
