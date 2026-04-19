import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import useAppStore from '../store/useAppStore'

/**
 * Subscribes to Supabase auth, exposes session + loading, syncs Zustand `user`.
 */
export function useAuthSession() {
  const setUser = useAppStore((s) => s.setUser)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      queueMicrotask(() => {
        setSession(null)
        setUser(null)
        setLoading(false)
      })
      return
    }

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null)
      setUser(nextSession?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setUser])

  return { session, user: session?.user ?? null, loading }
}
