const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

async function request(path, options = {}) {
  const token = localStorage.getItem('firebase_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Request failed')
  }

  return response.json()
}

async function postEvaluate(payload) {
  return request('/api/v1/evaluate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

async function getAnalytics(days = 30) {
  return request(`/api/v1/analytics?days=${days}`)
}

async function postDemoEvaluate(payload) {
  return request('/api/v1/demo/evaluate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

async function postBatchAudit(formData) {
  const response = await fetch(`${API_BASE_URL}/api/v1/batch/audit`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Batch audit failed')
  }

  return response.json()
}

async function postBatchAuditPdf(payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/batch/audit/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'PDF generation failed')
  }

  return response.blob()
}

export { getAnalytics, postBatchAudit, postBatchAuditPdf, postDemoEvaluate, postEvaluate }
