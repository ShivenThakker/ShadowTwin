import { useCallback, useEffect, useState } from 'react'
import {
  getIdToken,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth } from '../lib/firebase.js'

const provider = new GoogleAuthProvider()

async function storeToken(user) {
  if (user) {
    const token = await getIdToken(user)
    localStorage.setItem('firebase_token', token)
  } else {
    localStorage.removeItem('firebase_token')
  }
}

function useFirebaseAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (nextUser) => {
        await storeToken(nextUser)
        setUser(nextUser)
        setLoading(false)
      },
      (authError) => {
        setError(authError)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  const signIn = useCallback(async () => {
    setError(null)
    try {
      const result = await signInWithPopup(auth, provider)
      await storeToken(result.user)
      return result
    } catch (err) {
      const message = err.code === 'auth/popup-closed-by-user'
        ? 'Sign-in was cancelled. Please try again.'
        : err.code === 'auth/unauthorized-domain'
        ? 'Domain not authorized. Add localhost to Firebase Auth authorized domains.'
        : err.message
      setError(new Error(message))
      throw err
    }
  }, [])

  const signOutUser = useCallback(async () => {
    setError(null)
    await signOut(auth)
    localStorage.removeItem('firebase_token')
  }, [])

  return { error, loading, signIn, signOutUser, user }
}

export default useFirebaseAuth
