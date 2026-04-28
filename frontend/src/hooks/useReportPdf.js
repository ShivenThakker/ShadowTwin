import { useCallback, useState } from 'react'

function useReportPdf() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const downloadPdf = useCallback(async (reportData) => {
    setLoading(true)
    setError(null)
    try {
      const payload = {
        fairness_score: Math.round((100 - (reportData.bias_severity_score || 0))),
        biased_fields: [
          reportData.primary_causal_attribute,
          reportData.secondary_causal_attribute,
        ].filter(Boolean),
        flagged_rows: (reportData.shadow_results || [])
          .filter((r) => r.decision_diverged)
          .map((r, i) => ({
            row: i + 1,
            reason: `Decision flipped for ${r.attribute_tested}: changed to ${r.shadow_input_name || r.shadow_postcode || r.shadow_gender || r.shadow_location || r.shadow_university_tier || r.shadow_employment_gap_months || 'unknown'}`,
          })),
        summary: reportData.bias_explanation || 'No explanation available.',
        dataset_type: reportData.decision_category === 'loan_application' ? 'loan' : 'job',
      }

      const token = localStorage.getItem('firebase_token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/batch/audit/pdf`,
        { method: 'POST', headers, body: JSON.stringify(payload) }
      )

      if (!response.ok) throw new Error('PDF generation failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `bias-audit-${reportData.decision_id || reportData.id || 'report'}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  return { downloadPdf, error, loading }
}

export default useReportPdf
