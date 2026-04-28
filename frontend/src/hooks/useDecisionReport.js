import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

function useDecisionReport(decisionId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!decisionId) {
      setLoading(false)
      return
    }

    const fetchReport = async () => {
      try {
        const docRef = doc(db, 'decisions', decisionId)
        const snapshot = await getDoc(docRef)
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() })
        } else {
          setData(null)
        }
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [decisionId])

  return { data, error, loading }
}

export default useDecisionReport
