import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

function useDecisions(orgId = null) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!db) {
      setError(new Error('Firebase not initialized'))
      setLoading(false)
      return
    }

    const collectionRef = collection(db, 'decisions')
    const constraints = []
    // Show all decisions (from all orgs) - for demo/personal use
    constraints.push(limit(100))

    const decisionsQuery = query(collectionRef, ...constraints)
    const unsubscribe = onSnapshot(
      decisionsQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setItems(docs)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [orgId])

  return { error, items, loading }
}

export default useDecisions
