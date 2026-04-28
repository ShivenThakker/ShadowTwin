import { useCallback, useState } from 'react'
import { postBatchAudit, postBatchAuditPdf } from '../lib/api.js'

function useBatchAudit() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const runAudit = useCallback(async (file, datasetType) => {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('dataset_type', datasetType)
      const response = await postBatchAudit(formData)
      setData(response)
      return response
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const downloadPdf = useCallback(async (report) => {
    const blob = await postBatchAuditPdf(report)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'batch-bias-audit.pdf'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { data, downloadPdf, error, loading, reset, runAudit }
}

export default useBatchAudit
