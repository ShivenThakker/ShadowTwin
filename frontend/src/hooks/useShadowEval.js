import { useCallback, useState } from 'react'
import { postDemoEvaluate } from '../lib/api.js'

function useShadowEval() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const evaluate = useCallback(async (payload) => {
    setLoading(true)
    setError(null)
    try {
      const response = await postDemoEvaluate(payload)
      setData(response)
      // Store for Export Report button
      if (response) {
        const csv = JSON.stringify(response)
        localStorage.setItem('last_decisions', csv)
      }
      return response
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { data, error, evaluate, loading, reset }
}

export default useShadowEval
