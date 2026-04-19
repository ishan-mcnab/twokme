import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import useAppStore from '../store/useAppStore'
import { Button } from '../components/ui/Button'
import { generateDrillsForWorkout } from '../lib/drillGenerator'
import {
  fetchWorkoutPlanForBuild,
  getDayForCurrentPlanIndex,
  getPlanTotalDays,
  getPlanWeekMeta,
} from '../lib/planGenerator'
import { logWorkoutAndDistributeXP } from '../lib/xpSystem'
import { getStreakStatus, isStreakMilestone, utcDateString } from '../lib/streakSystem'

const HOLD_MS = 2000
const ACTIVE_RECOVERY_ITEMS = [
  '10 min light jog or walk',
  'Full body stretch — 15 minutes',
  'Ball handling warmup — 5 minutes of slow dribbling',
]

const NEON_FOCUS = [
  'var(--neon-blue)',
  'var(--neon-green)',
  'var(--neon-purple)',
  'var(--neon-gold)',
]

function formatAttrLabel(key) {
  return String(key || '').replaceAll('_', ' ')
}

function drillStorageKey(buildId, planDay) {
  return `twokme_drills_v1_${buildId}_${planDay}`
}

function intensityClass(intensity) {
  const k = String(intensity || '').toLowerCase()
  if (k === 'low') return 'text-[var(--text-muted)]'
  if (k === 'medium') return 'text-[var(--neon-blue)]'
  if (k === 'high') return 'text-[var(--neon-green)]'
  if (k === 'peak') return 'text-[var(--neon-gold)]'
  return 'text-[var(--text-muted)]'
}

function envLabel(environment) {
  const e = String(environment || '').toLowerCase()
  if (e === 'court') return '🏀 COURT'
  if (e === 'home_no_hoop') return '🏠 HOME (NO HOOP)'
  if (e === 'home_with_hoop') return '🏠 HOME + HOOP'
  if (e === 'home') return '🏠 HOME'
  return '🔄 HYBRID'
}

function ParticleBurst() {
  const n = 18
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative h-0 w-0">
        {Array.from({ length: n }).map((_, i) => {
          const angle = (i / n) * Math.PI * 2
          const dist = 80 + (i % 5) * 12
          return (
            <motion.span
              key={i}
              className="absolute left-0 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--neon-green)] shadow-[var(--glow-green)]"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                opacity: 0,
                scale: 0.2,
              }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
            />
          )
        })}
      </div>
    </div>
  )
}

export function Workout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentBuild = useAppStore((s) => s.currentBuild)
  const setCurrentBuild = useAppStore((s) => s.setCurrentBuild)
  const currentWorkoutPlan = useAppStore((s) => s.currentWorkoutPlan)
  const setCurrentWorkoutPlan = useAppStore((s) => s.setCurrentWorkoutPlan)
  const setCurrentStreak = useAppStore((s) => s.setCurrentStreak)
  const onboardingData = useAppStore((s) => s.onboardingData)

  const [drills, setDrills] = useState([])
  const [loadingDrills, setLoadingDrills] = useState(false)
  const [alreadyLogged, setAlreadyLogged] = useState(false)
  const [holdPct, setHoldPct] = useState(0)
  const [holding, setHolding] = useState(false)
  const [completion, setCompletion] = useState(false)
  const [flash, setFlash] = useState(false)
  const [xpEarnedMap, setXpEarnedMap] = useState(null)
  const [showXpPills, setShowXpPills] = useState(false)
  const [streakAfter, setStreakAfter] = useState(0)
  const [wasStreakBroken, setWasStreakBroken] = useState(false)
  const [milestoneHit, setMilestoneHit] = useState(false)
  const [planReady, setPlanReady] = useState(false)

  const holdTimerRef = useRef(null)
  const holdStartRef = useRef(0)
  const genRef = useRef(false)
  const completionTimersRef = useRef([])
  const loggingRef = useRef(false)

  const planData = currentWorkoutPlan?.plan_data
  const currentDay = Number(currentWorkoutPlan?.current_day) || 1
  const planRow = currentWorkoutPlan

  const resolved = useMemo(() => {
    if (!planData) return null
    return getDayForCurrentPlanIndex(planData, currentDay)
  }, [planData, currentDay])

  const day = resolved?.day
  const weekMeta = useMemo(
    () => (planData ? getPlanWeekMeta(planData, currentDay) : { weekNumber: 1, totalWeeks: 1 }),
    [planData, currentDay],
  )

  const totalPlanDays = planData ? getPlanTotalDays(planData) : 0
  const planComplete = totalPlanDays > 0 && currentDay > totalPlanDays

  useEffect(() => {
    let cancel = false
    async function hydratePlan() {
      if (!user?.id) {
        setPlanReady(false)
        return
      }
      const buildId = currentBuild?.id || useAppStore.getState().currentBuild?.id
      if (!buildId) {
        navigate('/dashboard', { replace: true })
        return
      }
      let row = useAppStore.getState().currentWorkoutPlan
      if (!row?.plan_data || row.build_id !== buildId) {
        row = await fetchWorkoutPlanForBuild(user.id, buildId)
        if (cancel) return
        if (row) setCurrentWorkoutPlan(row)
      }
      if (cancel) return
      const latest = useAppStore.getState().currentWorkoutPlan
      if (!latest?.plan_data) {
        navigate('/dashboard', { replace: true })
        return
      }
      setPlanReady(true)
    }
    void hydratePlan()
    return () => {
      cancel = true
    }
  }, [user?.id, currentBuild?.id, navigate, setCurrentWorkoutPlan])

  useEffect(() => {
    let cancel = false
    async function check() {
      if (!user?.id) return
      const buildId = currentBuild?.id || useAppStore.getState().currentBuild?.id
      if (!buildId) {
        if (!cancel) setAlreadyLogged(false)
        return
      }
      const s = await getStreakStatus(user.id, buildId, currentDay)
      if (!cancel) setAlreadyLogged(s.alreadyLoggedToday)
    }
    check()
    return () => {
      cancel = true
    }
  }, [user?.id, currentBuild?.id, currentDay])

  useEffect(() => {
    if (!planData || !currentBuild?.id || !day) return
    if (day.type !== 'workout') return
    if (genRef.current) return
    genRef.current = true

    queueMicrotask(() => {
      const key = drillStorageKey(currentBuild.id, currentDay)
      try {
        const raw = sessionStorage.getItem(key)
        if (raw) {
          const { d, date } = JSON.parse(raw)
          if (date === utcDateString() && Array.isArray(d) && d.length) {
            setDrills(d)
            return
          }
        }
      } catch {
        /* ignore */
      }

      setLoadingDrills(true)
      generateDrillsForWorkout(day, currentBuild, onboardingData)
        .then((d) => {
          setDrills(d)
          try {
            sessionStorage.setItem(
              key,
              JSON.stringify({ date: utcDateString(), d }),
            )
          } catch {
            /* ignore */
          }
        })
        .finally(() => setLoadingDrills(false))
    })
  }, [planData, currentBuild, day, currentDay, onboardingData])

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) {
      window.clearInterval(holdTimerRef.current)
      holdTimerRef.current = null
    }
    setHolding(false)
    setHoldPct(0)
  }, [])

  useEffect(() => {
    return () => {
      clearHold()
      completionTimersRef.current.forEach((id) => window.clearTimeout(id))
    }
  }, [clearHold])

  const runCompletion = useCallback(async () => {
    const buildId = planRow?.build_id || useAppStore.getState().currentBuild?.id
    if (loggingRef.current || !user?.id || !buildId || !planRow?.id || !day) return
    loggingRef.current = true
    completionTimersRef.current.forEach((id) => window.clearTimeout(id))
    completionTimersRef.current = []

    const pre = await getStreakStatus(user.id, buildId, Number(planRow?.current_day) || 1)
    setWasStreakBroken(pre.streakBroken)

    setCompletion(true)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 150)

    let result
    try {
      const kind = day.type === 'active_recovery' ? 'active_recovery' : 'workout'
      result = await logWorkoutAndDistributeXP(user.id, buildId, day, planRow, drills, kind)
    } catch {
      loggingRef.current = false
      setCompletion(false)
      setFlash(false)
      return
    }

    if (result.skipped) {
      loggingRef.current = false
      navigate('/dashboard', { replace: true })
      return
    }

    const prevBuild = useAppStore.getState().currentBuild
    setCurrentBuild({ ...(prevBuild || {}), attributes: result.attributes })
    setCurrentWorkoutPlan(result.planRow)
    setCurrentStreak(result.streakDay)
    setStreakAfter(result.streakDay)
    setMilestoneHit(isStreakMilestone(result.streakDay))
    setXpEarnedMap(result.xpEarned || {})

    const t0 = performance.now()
    const showXpDelay = Math.max(0, 800 - (performance.now() - t0))
    const id1 = window.setTimeout(() => setShowXpPills(true), showXpDelay)
    const id2 = window.setTimeout(() => navigate('/dashboard', { replace: true }), 2500)
    completionTimersRef.current.push(id1, id2)
  }, [user, planRow, day, drills, navigate, setCurrentBuild, setCurrentWorkoutPlan, setCurrentStreak])

  const onPointerDown = () => {
    if (completion || alreadyLogged) return
    if (day?.type === 'rest') return
    setHolding(true)
    holdStartRef.current = performance.now()
    if (holdTimerRef.current) window.clearInterval(holdTimerRef.current)
    holdTimerRef.current = window.setInterval(() => {
      const elapsed = performance.now() - holdStartRef.current
      const pct = Math.min(100, Math.round((elapsed / HOLD_MS) * 100))
      setHoldPct(pct)
      if (elapsed >= HOLD_MS) {
        if (holdTimerRef.current) {
          window.clearInterval(holdTimerRef.current)
          holdTimerRef.current = null
        }
        setHolding(false)
        setHoldPct(0)
        void runCompletion()
      }
    }, 32)
  }

  const onPointerUpLeave = () => {
    if (completion) return
    clearHold()
  }

  if (!planReady || !planData || !day) {
    return (
      <div className="min-h-dvh bg-[var(--bg-primary)] px-4 py-16 text-center font-body text-[var(--text-secondary)]">
        <p className="animate-pulse font-mono text-xs uppercase tracking-wider">Loading plan…</p>
        <Button className="mt-8 min-h-[44px]" variant="ghost" onClick={() => navigate('/dashboard')}>
          ← Back to dashboard
        </Button>
      </div>
    )
  }

  if (planComplete) {
    return (
      <div className="min-h-dvh bg-[var(--bg-primary)] px-4 py-16 text-center text-[var(--text-primary)]">
        <p className="font-display text-3xl font-bold uppercase tracking-tight text-[var(--neon-gold)]">
          PLAN COMPLETE 🏆
        </p>
        <p className="mx-auto mt-4 max-w-md font-body text-sm text-[var(--text-secondary)]">
          You have finished every scheduled day. Head home to start a new combine when you are ready.
        </p>
        <Button className="mt-10 min-h-[44px]" variant="primary" onClick={() => navigate('/dashboard')}>
          BACK TO DASHBOARD
        </Button>
      </div>
    )
  }

  if (alreadyLogged && (day.type === 'workout' || day.type === 'active_recovery')) {
    return (
      <div className="min-h-dvh bg-[var(--bg-primary)] px-4 py-16 text-center">
        <p className="font-mono text-sm text-[var(--neon-green)]">✓ LOGGED TODAY</p>
        <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">
          Come back tomorrow for the next session.
        </p>
        <Button className="mt-8" variant="ghost" onClick={() => navigate('/dashboard')}>
          ← BACK TO DASHBOARD
        </Button>
      </div>
    )
  }

  if (day.type === 'rest') {
    return (
      <div className="min-h-dvh bg-[var(--bg-primary)] px-6 py-10">
        <div className="mx-auto flex min-h-[70dvh] max-w-[480px] flex-col justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8">
          <p className="text-center font-display text-5xl font-bold uppercase tracking-tight text-[var(--text-muted)]">
            REST DAY
          </p>
          <p className="mt-6 text-center font-body text-sm italic text-[var(--text-secondary)]">
            {day.coachNote}
          </p>
          <div className="mt-10">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Recovery
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 font-body text-sm text-[var(--text-secondary)]">
              <li>Hydrate consistently through the day</li>
              <li>Prioritize 8+ hours of sleep tonight</li>
              <li>Light stretching — hips, ankles, shoulders</li>
            </ul>
          </div>
          <Button className="mt-12 w-full" variant="ghost" onClick={() => navigate('/dashboard')}>
            ← BACK TO DASHBOARD
          </Button>
        </div>
      </div>
    )
  }

  const xpEntries =
    xpEarnedMap && typeof xpEarnedMap === 'object'
      ? Object.entries(xpEarnedMap).filter(([, v]) => Number(v) > 0)
      : []

  return (
    <div className="relative min-h-dvh bg-[var(--bg-primary)] pb-36 text-[var(--text-primary)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[rgba(8,8,16,0.92)] backdrop-blur-md">
        <div className="mx-auto flex h-12 w-full max-w-[480px] items-center px-3">
          <button
            type="button"
            className="font-mono text-sm text-[var(--text-secondary)]"
            onClick={() => navigate('/dashboard')}
          >
            ←
          </button>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            DAY {resolved?.indexOneBased ?? currentDay} · WEEK {weekMeta.weekNumber ?? 1}
          </span>
        </div>
      </header>

      {day.type === 'active_recovery' ? (
        <main className="mx-auto max-w-[480px] space-y-6 px-4 py-6">
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-[var(--neon-green)]">
            ACTIVE RECOVERY
          </p>
          <p className="font-body text-base text-[var(--text-secondary)]">{day.coachNote}</p>
          <ul className="space-y-3 font-body text-sm text-[var(--text-primary)]">
            {ACTIVE_RECOVERY_ITEMS.map((line) => (
              <li
                key={line}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3"
              >
                {line}
              </li>
            ))}
          </ul>
        </main>
      ) : (
        <main className="mx-auto max-w-[480px] space-y-5 px-4 py-6">
          <h1 className="font-display text-3xl font-bold uppercase leading-none tracking-tight text-white">
            {day.workoutName}
          </h1>
          <div className="flex flex-wrap gap-2">
            {(day.focusAttributes || []).map((attr, i) => (
              <span
                key={attr}
                className="rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase"
                style={{
                  borderColor: NEON_FOCUS[i % NEON_FOCUS.length],
                  color: NEON_FOCUS[i % NEON_FOCUS.length],
                  boxShadow: `0 0 12px color-mix(in srgb, ${NEON_FOCUS[i % NEON_FOCUS.length]} 35%, transparent)`,
                }}
              >
                {formatAttrLabel(attr)}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <span className={`font-bold uppercase ${intensityClass(day.intensity)}`}>
              {String(day.intensity || '').toUpperCase()}
            </span>
            <span className="text-[var(--text-muted)]">·</span>
            <span className="text-[var(--text-muted)]">
              {day.durationMinutes != null ? `${day.durationMinutes} MIN` : '—'}
            </span>
            <span className="text-[var(--text-muted)]">·</span>
            <span className="text-[var(--text-muted)]">{envLabel(day.environment)}</span>
          </div>

          {loadingDrills ? (
            <div className="space-y-4 pt-2">
              <p className="animate-pulse text-center font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">
                LOADING YOUR DRILLS...
              </p>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="workout-skeleton h-28 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {drills.map((d, i) => (
                <motion.article
                  key={`${d.name}-${i}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.35, ease: 'easeOut' }}
                  className="relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"
                >
                  <h2 className="font-display text-xl font-bold text-white">{d.name}</h2>
                  <span className="mt-2 inline-block rounded-full border border-[var(--neon-gold)]/50 bg-[rgba(255,215,0,0.08)] px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-[var(--neon-gold)]">
                    {String(d.attributeTarget || '').toUpperCase()}
                  </span>
                  <p className="mt-2 font-mono text-[11px] text-[var(--text-muted)]">{d.duration}</p>
                  <p className="mt-2 font-body text-xs leading-relaxed text-[var(--text-secondary)]">
                    {d.description}
                  </p>
                  <p className="absolute bottom-3 right-4 font-mono text-sm font-bold text-[var(--neon-gold)]">
                    +{d.xp} XP
                  </p>
                </motion.article>
              ))}
            </div>
          )}

          <div className="pt-4">
            <div className="neon-line opacity-40" />
            <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              COACH
            </p>
            <p className="mt-2 font-body text-sm italic text-[var(--text-secondary)]">{day.coachNote}</p>
          </div>
        </main>
      )}

      {(day.type === 'workout' || day.type === 'active_recovery') && !completion ? (
        <div className="hold-to-log-button fixed left-0 right-0 z-30 px-6" style={{ bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="mx-auto max-w-[480px]">
            <motion.button
              type="button"
              disabled={loadingDrills && day.type === 'workout'}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUpLeave}
              onPointerCancel={onPointerUpLeave}
              onPointerLeave={onPointerUpLeave}
              animate={holding ? { scale: [1, 1.02, 1] } : { scale: 1 }}
              transition={holding ? { repeat: Infinity, duration: 0.5 } : {}}
              className="relative min-h-[64px] w-full overflow-hidden rounded-[50px] border border-[var(--neon-green)] bg-[var(--bg-elevated)] py-4 text-center font-display text-sm font-bold uppercase tracking-[0.15em] text-[var(--neon-green)] disabled:opacity-40"
            >
              <span
                className="pointer-events-none absolute inset-y-0 left-0 bg-[var(--neon-green)]/35"
                style={{ width: `${holdPct}%` }}
              />
              <span className="relative z-[1]">
                {holding ? `HOLD... ${holdPct}%` : 'HOLD TO LOG WORKOUT'}
              </span>
            </motion.button>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {completion ? (
          <motion.div
            className="fixed inset-0 z-[50] flex flex-col items-center justify-center bg-[rgba(8,8,16,0.88)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {flash ? (
              <motion.div
                className="pointer-events-none absolute inset-0 bg-[var(--neon-green)]"
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            ) : null}
            <div className="relative">
              <ParticleBurst />
              <motion.p
                className="relative z-[1] text-center font-display text-4xl font-bold uppercase leading-none text-[var(--neon-green)] [text-shadow:var(--glow-green)] sm:text-6xl"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              >
                WORKOUT LOGGED
              </motion.p>
            </div>

            {showXpPills && xpEntries.length ? (
              <div className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center gap-2">
                {xpEntries.map(([k, amt], i) => (
                  <motion.div
                    key={k}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: -48 }}
                    transition={{ delay: i * 0.15, duration: 1, ease: 'easeOut' }}
                    className="font-mono text-sm font-bold text-[var(--neon-gold)]"
                  >
                    +{amt} XP · {String(k).toUpperCase()}
                  </motion.div>
                ))}
              </div>
            ) : null}

            <div className="pointer-events-none absolute bottom-24 left-0 right-0 flex flex-col items-center gap-2 px-4 text-center">
              {wasStreakBroken ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="font-display text-xl font-bold uppercase text-[var(--neon-red)]"
                >
                  STREAK RESET
                </motion.p>
              ) : (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="font-mono text-lg font-bold text-[var(--neon-gold)]"
                >
                  🔥 {streakAfter} day streak
                </motion.p>
              )}
              {milestoneHit ? (
                <motion.p
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.75, type: 'spring' }}
                  className="font-display text-sm font-bold uppercase tracking-[0.2em] text-[var(--neon-purple)]"
                >
                  MILESTONE UNLOCKED
                </motion.p>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
