import { useMemo } from 'react'
import { AuthContext } from './auth-context.js'
import { useAuthSession } from '../hooks/useAuthSession'

export function AuthProvider({ children }) {
  const { session, user, loading } = useAuthSession()
  const value = useMemo(
    () => ({ session, user, loading }),
    [session, user, loading],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
