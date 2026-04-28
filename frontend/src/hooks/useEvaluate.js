import { useCallback, useState } from 'react'
import { postEvaluate } from '../lib/api.js'

function useEvaluate() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const evaluate = useCallback(async (payload) => {
    setLoading(true)
    setError(null)
    try {
      const response = await postEvaluate(payload)
      setData(response)
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

export default useEvaluate
