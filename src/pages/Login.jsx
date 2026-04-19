import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Logo } from '../components/Logo'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PageWrapper } from '../components/ui/PageWrapper'
import {
  isSupabaseConfigured,
  signInWithEmail,
  signInWithGoogle,
} from '../lib/auth'
import { resolvePostLoginPath } from '../lib/postAuthRedirect'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (!isSupabaseConfigured()) {
        setError('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.')
        return
      }
      const { data, error: signError } = await signInWithEmail(email, password)
      if (signError) {
        setError(signError.message)
        return
      }
      if (!data.user) {
        setError('Check your email to confirm your account, then try again.')
        return
      }
      const next = await resolvePostLoginPath(data.user.id)
      navigate(next, { replace: true })
    } catch (err) {
      setError(err?.message ?? 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function onGoogle() {
    setError('')
    setBusy(true)
    try {
      if (!isSupabaseConfigured()) {
        setError('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.')
        return
      }
      const { error: oauthError } = await signInWithGoogle()
      if (oauthError) setError(oauthError.message)
    } catch (err) {
      setError(err?.message ?? 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--bg-primary)]">
      <PageWrapper className="py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mx-auto w-full max-w-[400px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-8 shadow-[0_0_40px_rgba(0,0,0,0.45)]"
        >
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>

          <h1 className="mb-6 text-center font-display text-2xl font-bold uppercase tracking-wide text-[var(--text-primary)]">
            Sign In
          </h1>

          {!isSupabaseConfigured() ? (
            <p className="mb-4 text-center text-sm text-[var(--text-secondary)]">
              Supabase environment variables are missing. Add them to{' '}
              <span className="font-mono text-[var(--neon-blue)]">.env.local</span>{' '}
              and restart the dev server.
            </p>
          ) : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Email
              </label>
              <Input
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Password
              </label>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error ? (
              <p className="text-sm text-[#ff6b86]" role="alert">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={busy}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={onGoogle}
              disabled={busy}
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </div>

          <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
            New here?{' '}
            <Link
              className="font-semibold text-[var(--neon-blue)] hover:underline"
              to="/signup"
            >
              Create an account
            </Link>
          </p>
        </motion.div>
      </PageWrapper>
    </div>
  )
}
