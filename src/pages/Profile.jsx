import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import useAppStore from '../store/useAppStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { signOut } from '../lib/auth'
import { supabase } from '../lib/supabase'

function formatMemberSince(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

export function Profile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentBuild = useAppStore((s) => s.currentBuild)
  const currentStreak = useAppStore((s) => s.currentStreak)
  const resetForSignOut = useAppStore((s) => s.resetForSignOut)
  const resetAfterBuildDelete = useAppStore((s) => s.resetAfterBuildDelete)

  const [username, setUsername] = useState('Player')
  const [position, setPosition] = useState('—')
  const [heightIn, setHeightIn] = useState(null)
  const [weightLbs, setWeightLbs] = useState(null)
  const [memberSince, setMemberSince] = useState(null)
  const [stats, setStats] = useState({
    workouts: 0,
    xpTotal: 0,
    longestStreak: 0,
  })
  const [loadError, setLoadError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id || !supabase) return
      setLoadError('')
      try {
        const { data: prof, error: pErr } = await supabase
          .from('profiles')
          .select('username, position, height_inches, weight_lbs, created_at')
          .eq('id', user.id)
          .maybeSingle()
        if (pErr) throw pErr
        if (!cancelled && prof) {
          if (prof.username?.trim()) setUsername(prof.username.trim())
          if (prof.position) setPosition(String(prof.position).toUpperCase())
          setHeightIn(prof.height_inches ?? null)
          setWeightLbs(prof.weight_lbs ?? null)
          setMemberSince(prof.created_at || null)
        }

        const buildId = currentBuild?.id
        if (!buildId) {
          return
        }

        const { count: workoutCount } = await supabase
          .from('workout_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('build_id', buildId)

        const { data: prog } = await supabase
          .from('attribute_progress')
          .select('total_xp')
          .eq('user_id', user.id)
          .eq('build_id', buildId)

        const xpTotal = (prog || []).reduce((a, r) => a + (Number(r.total_xp) || 0), 0)

        const { data: streakRows } = await supabase
          .from('workout_logs')
          .select('streak_day')
          .eq('user_id', user.id)
          .eq('build_id', buildId)

        const longestStreak = (streakRows || []).reduce(
          (m, r) => Math.max(m, Number(r.streak_day) || 0),
          0,
        )
        if (!cancelled) {
          setStats({
            workouts: workoutCount || 0,
            xpTotal,
            longestStreak,
          })
        }
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Could not load profile.')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user?.id, currentBuild?.id])

  const heightLabel = useMemo(() => {
    if (heightIn == null) return '—'
    const ft = Math.floor(heightIn / 12)
    const inch = heightIn % 12
    return `${ft}'${inch}"`
  }, [heightIn])

  const onSignOut = useCallback(async () => {
    setSigningOut(true)
    try {
      await signOut()
      resetForSignOut()
      navigate('/', { replace: true })
    } catch {
      setSigningOut(false)
    }
  }, [navigate, resetForSignOut])

  const onResetBuild = useCallback(async () => {
    if (!user?.id || !supabase || !currentBuild?.id) return
    setResetting(true)
    setLoadError('')
    try {
      const buildId = currentBuild.id
      await supabase.from('workout_logs').delete().eq('user_id', user.id).eq('build_id', buildId)
      await supabase.from('attribute_progress').delete().eq('user_id', user.id).eq('build_id', buildId)
      await supabase.from('workout_plans').delete().eq('user_id', user.id).eq('build_id', buildId)
      await supabase.from('player_builds').delete().eq('id', buildId)
      resetAfterBuildDelete()
      setShowResetModal(false)
      navigate('/onboarding', { replace: true })
    } catch (e) {
      setLoadError(e?.message || 'Reset failed.')
    } finally {
      setResetting(false)
    }
  }, [user, currentBuild, navigate, resetAfterBuildDelete])

  return (
    <div className="min-h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[rgba(8,8,16,0.92)] px-4 py-3 backdrop-blur-md">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-white">MY PROFILE</h1>
      </header>

      <main className="mx-auto max-w-[480px] space-y-6 px-4 py-6">
        {loadError ? (
          <p className="font-body text-sm text-[var(--neon-red)]">{loadError}</p>
        ) : null}

        <Card className="p-5">
          <p className="font-display text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Player
          </p>
          <p className="mt-2 font-display text-2xl font-bold uppercase text-white">{username}</p>
          <p className="mt-2 font-mono text-sm text-[var(--text-secondary)]">
            {position} · {heightLabel}
            {weightLbs != null ? ` · ${weightLbs} lbs` : ''}
          </p>
          <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">
            Archetype:{' '}
            <span className="font-display font-bold uppercase text-[var(--neon-blue)]">
              {currentBuild?.archetype || '—'}
            </span>
          </p>
          <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
            Member since {formatMemberSince(memberSince)}
          </p>
        </Card>

        <Card className="p-5">
          <p className="font-display text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Stats
          </p>
          <ul className="mt-4 space-y-3 font-mono text-sm text-[var(--text-secondary)]">
            <li className="flex justify-between">
              <span>Workouts logged</span>
              <span className="text-white">{stats.workouts}</span>
            </li>
            <li className="flex justify-between">
              <span>Total XP (banked)</span>
              <span className="text-[var(--neon-gold)]">{stats.xpTotal.toLocaleString()}</span>
            </li>
            <li className="flex justify-between">
              <span>Longest streak</span>
              <span className="text-white">{stats.longestStreak}</span>
            </li>
            <li className="flex justify-between">
              <span>Current streak</span>
              <span className="text-white">{currentStreak}</span>
            </li>
          </ul>
        </Card>

        <Button
          className="min-h-[44px] w-full"
          variant="secondary"
          type="button"
          disabled={signingOut}
          onClick={() => void onSignOut()}
        >
          {signingOut ? 'SIGNING OUT…' : 'SIGN OUT'}
        </Button>

        <div className="rounded-2xl border border-[var(--neon-red)]/30 bg-[rgba(255,51,85,0.06)] p-4">
          <p className="font-display text-xs font-bold uppercase tracking-wider text-[var(--neon-red)]">
            Danger zone
          </p>
          <p className="mt-2 font-body text-xs text-[var(--text-secondary)]">
            Deletes your build, plan, logs, and attribute progress. Your account stays signed in.
          </p>
          <Button
            className="mt-4 min-h-[44px] w-full border border-[var(--neon-red)]/50 bg-transparent text-[var(--neon-red)] hover:bg-[rgba(255,51,85,0.12)]"
            variant="ghost"
            type="button"
            onClick={() => setShowResetModal(true)}
          >
            RESET BUILD
          </Button>
        </div>
      </main>

      {showResetModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(0,0,0,0.75)] px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[360px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6"
          >
            <p className="font-display text-lg font-bold uppercase text-white">Reset build?</p>
            <p className="mt-3 font-body text-sm text-[var(--text-secondary)]">
              This cannot be undone. You will return to onboarding to start a new combine.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                className="min-h-[44px] w-full bg-[var(--neon-red)] text-white"
                variant="primary"
                type="button"
                disabled={resetting}
                onClick={() => void onResetBuild()}
              >
                {resetting ? 'DELETING…' : 'YES, DELETE EVERYTHING'}
              </Button>
              <Button
                className="min-h-[44px] w-full"
                variant="secondary"
                type="button"
                disabled={resetting}
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  )
}
