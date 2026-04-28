import { useEffect, useMemo, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { realtimeDb } from '../lib/firebase.js'

function useLiveFeed(orgId = 'demo') {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!realtimeDb) {
      setError(new Error('Realtime DB not initialized'))
      setLoading(false)
      return
    }

    const feedRef = ref(realtimeDb, `live_feed/${orgId}`)
    const unsubscribe = onValue(
      feedRef,
      (snapshot) => {
        const value = snapshot.val() || {}
        const rows = Object.entries(value).map(([id, entry]) => ({
          id,
          ...entry,
        }))
        rows.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        setItems(rows)
        setLoading(false)
      },
      (dbError) => {
        setError(dbError)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [orgId])

  const latest = useMemo(() => items.slice(0, 50), [items])

  return { error, items: latest, loading }
}

export default useLiveFeed
