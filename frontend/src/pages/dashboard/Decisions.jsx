import useFirebaseAuth from '../../hooks/useFirebaseAuth.js'
import useDecisions from '../../hooks/useDecisions.js'
import useLiveFeed from '../../hooks/useLiveFeed.js'

function formatTimestamp(timestamp) {
  if (!timestamp) return '—'
  const ms = typeof timestamp?.toMillis === 'function' ? timestamp.toMillis() : typeof timestamp === 'number' ? timestamp : Date.parse(timestamp)
  const date = new Date(ms)
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getTimestampMs(timestamp) {
  if (!timestamp) return 0
  if (typeof timestamp?.toMillis === 'function') return timestamp.toMillis()
  if (typeof timestamp === 'number') return timestamp
  return Date.parse(timestamp) || 0
}

function toSeverityBadge(score) {
  if (score >= 51) return 'danger'
  if (score >= 21) return 'warning'
  return 'success'
}

function formatAttribute(attr) {
  if (!attr) return '—'
  return attr.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function Decisions() {
  const { user } = useFirebaseAuth()
  const orgId = 'demo'
  const { error: feedError, items: liveItems, loading: liveLoading } = useLiveFeed(orgId)
  const { error: dbError, items: decisions, loading: dbLoading } = useDecisions(orgId)

  // Combine and dedupe by decision_id
  const allItems = [...decisions]
  liveItems.forEach((item) => {
    if (!allItems.find((d) => d.id === item.id)) {
      allItems.push(item)
    }
  })

  // Sort by timestamp ascending (oldest first, newest last)
  const sortedRows = allItems
    .slice()
    .sort((a, b) => getTimestampMs(a.timestamp) - getTimestampMs(b.timestamp))

  const loading = dbLoading && liveLoading
  const error = dbError || feedError

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Decision feed</h2>
        <span className="badge neutral">Live updates</span>
      </div>
      <div className="table">
        <div className="table-row header">
          <span>Time</span>
          <span>Applicant</span>
          <span>Category</span>
          <span>Severity</span>
        </div>
        {loading ? <div className="empty-state">Loading decisions...</div> : null}
        {error ? <div className="empty-state">Unable to load decisions.</div> : null}
        {!loading && !error && sortedRows.length === 0 ? (
          <div className="empty-state">No decisions yet. Run a demo evaluation first.</div>
        ) : null}
        {sortedRows.map((item) => (
          <div className="table-row" key={item.id || item.decision_id}>
            <span>{formatTimestamp(item.timestamp)}</span>
            <span>{item.applicant_name || item.applicant_name_hashed ? formatAttribute(item.applicant_name || item.applicant_name_hashed) : 'Unknown'}</span>
            <span>{item.decision_category ? formatAttribute(item.decision_category) : item.category ? formatAttribute(item.category) : '—'}</span>
            <span
              className={`badge ${toSeverityBadge(item.bias_severity_score || item.severity_score || 0)}`}
            >
              {item.bias_severity_score ?? item.severity_score ?? '—'}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Decisions
