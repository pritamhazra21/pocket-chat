import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { upsertUser } from '../lib/chat'
import { startPresence, stopPresence } from '../lib/presence'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      // Show the app immediately — never block the UI on a Firestore write.
      setUser(u)
      setLoading(false)
      if (u) {
        // Fire-and-forget; if Firestore is missing/locked it just logs.
        upsertUser(u).catch((e) => console.error('[auth] profile write failed:', e))
        startPresence(u.uid)
      } else {
        stopPresence()
      }
    })
    return unsub
  }, [])

  const login = () => signInWithPopup(auth, googleProvider)
  const logout = async () => {
    if (user) stopPresence(user.uid)
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
