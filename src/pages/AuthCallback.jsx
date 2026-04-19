import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { resolvePostLoginPath } from '../lib/postAuthRedirect'

export function AuthCallback() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Signing you in…')

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!supabase) {
        navigate('/login', { replace: true })
        return
      }

      const { data, error } = await supabase.auth.getSession()
      if (cancelled) return

      if (error || !data.session?.user) {
        setMessage('Could not complete sign-in.')
        navigate('/login', { replace: true })
        return
      }

      const next = await resolvePostLoginPath(data.session.user.id)
      if (cancelled) return
      navigate(next, { replace: true })
    }

    run()
    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg-primary)] px-6 text-center font-body text-[var(--text-secondary)]">
      {message}
    </div>
  )
}
