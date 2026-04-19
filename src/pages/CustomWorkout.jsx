import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import useAppStore from '../store/useAppStore'
import { Button } from '../components/ui/Button'
import { ATTRIBUTE_UI_GROUPS } from '../lib/attributeUiGroups'
import { logCustomWorkout } from '../lib/xpSystem'
import { getStreakStatus, isStreakMilestone, utcDateString } from '../lib/streakSystem'
import { fetchWorkoutPlanForBuild, syncWorkoutPlanCalendarDay } from '../lib/planGenerator'

function formatAttrLabel(key) {
  return String(key || '').replaceAll('_', ' ')
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

export function CustomWorkout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentBuild = useAppStore((s) => s.currentBuild)
  const setCurrentBuild = useAppStore((s) => s.setCurrentBuild)
  const currentWorkoutPlan = useAppStore((s) => s.currentWorkoutPlan)
  const setCurrentWorkoutPlan = useAppStore((s) => s.setCurrentWorkoutPlan)
  const setCurrentStreak = useAppStore((s) => s.setCurrentStreak)

  const [step, setStep] = useState(1)
  const [workoutName, setWorkoutName] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [intensity, setIntensity] = useState('moderate')
  const [submitting, setSubmitting] = useState(false)
  const [completion, setCompletion] = useState(false)
  const [flash, setFlash] = useState(false)
  const [xpEarnedMap, setXpEarnedMap] = useState(null)
  const [showXpPills, setShowXpPills] = useState(false)
  const [streakAfter, setStreakAfter] = useState(0)
  const [wasStreakBroken, setWasStreakBroken] = useState(false)
  const [milestoneHit, setMilestoneHit] = useState(false)

  const completionTimersRef = useRef([])

  useEffect(() => {
    let cancel = false
    async function loadPlanDay() {
      if (!user?.id || !currentBuild?.id) return
      let row = currentWorkoutPlan
      if (!row?.plan_data || row.build_id !== currentBuild.id) {
        row = await fetchWorkoutPlanForBuild(user.id, currentBuild.id)
      }
      if (cancel) return
      if (row?.id) {
        row = await syncWorkoutPlanCalendarDay(row)
        if (!cancel) setCurrentWorkoutPlan(row)
      } else if (row && !cancel) {
        setCurrentWorkoutPlan(row)
      }
    }
    void loadPlanDay()
    return () => {
      cancel = true
    }
  }, [user?.id, currentBuild?.id, currentWorkoutPlan, setCurrentWorkoutPlan])

  useEffect(() => {
    const ref = completionTimersRef
    return () => {
      ref.current.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  const toggleAttr = useCallback((key) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        return next
      }
      if (next.size >= 3) return prev
      next.add(key)
      return next
    })
  }, [])

  const selectedList = useMemo(() => [...selected].sort(), [selected])

  const runSubmit = useCallback(async () => {
    if (!user?.id || !currentBuild?.id || submitting) return
    const plan = useAppStore.getState().currentWorkoutPlan
    if (!plan?.id) {
      return
    }

    setSubmitting(true)
    completionTimersRef.current.forEach((id) => window.clearTimeout(id))
    completionTimersRef.current = []
    setShowXpPills(false)

    const planDayNum = Number(plan.current_day) || 1
    const pre = await getStreakStatus(user.id, currentBuild.id, planDayNum, {
      planLastLoggedDate: plan.last_logged_date,
    })
    setWasStreakBroken(pre.streakBroken)

    setCompletion(true)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 150)

    try {
      const result = await logCustomWorkout(
        user.id,
        currentBuild.id,
        {
          workoutName,
          focusAttributes: selectedList,
          intensity,
        },
        plan,
      )
      if (result.skipped) {
        setSubmitting(false)
        setCompletion(false)
        setFlash(false)
        navigate('/dashboard', { replace: true })
        return
      }
      const prevBuild = useAppStore.getState().currentBuild
      setCurrentBuild({ ...(prevBuild || {}), attributes: result.attributes })
      if (result.planRow) setCurrentWorkoutPlan(result.planRow)
      setCurrentStreak(result.streakDay)
      setStreakAfter(result.streakDay)
      setMilestoneHit(isStreakMilestone(result.streakDay))
      setXpEarnedMap({ ...(result.xpEarned || {}) })

      const t0 = performance.now()
      const showXpDelay = Math.max(0, 800 - (performance.now() - t0))
      const id1 = window.setTimeout(() => setShowXpPills(true), showXpDelay)
      const id2 = window.setTimeout(() => navigate('/dashboard', { replace: true }), 2500)
      completionTimersRef.current.push(id1, id2)
    } catch {
      setCompletion(false)
      setFlash(false)
    } finally {
      setSubmitting(false)
    }
  }, [
    user,
    currentBuild,
    submitting,
    workoutName,
    selectedList,
    intensity,
    navigate,
    setCurrentBuild,
    setCurrentStreak,
    setCurrentWorkoutPlan,
  ])

  useEffect(() => {
    if (!user?.id || !currentBuild?.id) {
      navigate('/dashboard', { replace: true })
    }
  }, [user?.id, currentBuild?.id, navigate])

  const xpEntries =
    xpEarnedMap && typeof xpEarnedMap === 'object'
      ? Object.entries(xpEarnedMap).filter(([, v]) => Number(v) > 0)
      : []

  const nameOk = workoutName.trim().length > 0 && workoutName.trim().length <= 50
  const threeOk = selected.size === 3

  return (
    <div className="relative min-h-dvh bg-[var(--bg-primary)] pb-32 text-[var(--text-primary)]">
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
            CUSTOM · {utcDateString()}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[480px] space-y-8 px-4 py-8">
        <div className="flex justify-center gap-2">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={[
                'h-1.5 w-8 rounded-full',
                step >= n ? 'bg-[var(--neon-blue)]' : 'bg-[var(--bg-elevated)]',
              ].join(' ')}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <p className="text-center font-display text-xl font-bold uppercase tracking-wide text-white">
                What did you work on?
              </p>
              <input
                type="text"
                maxLength={50}
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="e.g. Shooting drills, Pickup game, Gym session"
                className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-4 text-center font-body text-lg text-[var(--text-primary)] outline-none ring-[var(--neon-blue)] focus:ring-2"
              />
              <p className="text-center font-mono text-[10px] text-[var(--text-muted)]">
                {workoutName.length} / 50
              </p>
              <Button
                className="w-full min-h-[48px]"
                variant="primary"
                disabled={!nameOk}
                onClick={() => setStep(2)}
              >
                NEXT →
              </Button>
            </motion.div>
          ) : null}

          {step === 2 ? (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="text-center">
                <p className="font-display text-xl font-bold uppercase tracking-wide text-white">
                  Which 3 attributes did this target?
                </p>
                <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">Select exactly 3</p>
                <p className="mt-2 font-mono text-xs text-[var(--neon-blue)]">
                  {selected.size} / 3 selected
                </p>
              </div>
              <div className="max-h-[52dvh] space-y-6 overflow-y-auto pr-1">
                {ATTRIBUTE_UI_GROUPS.map((group) => (
                  <div key={group.id}>
                    <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {group.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.keys.map((key) => {
                        const on = selected.has(key)
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleAttr(key)}
                            className={[
                              'rounded-full border px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase transition-colors',
                              on
                                ? 'border-[var(--neon-blue)] bg-[rgba(0,212,255,0.2)] text-[var(--neon-blue)]'
                                : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
                            ].join(' ')}
                          >
                            {formatAttrLabel(key)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" variant="ghost" onClick={() => setStep(1)}>
                  ← Back
                </Button>
                <Button className="flex-1 min-h-[48px]" variant="primary" disabled={!threeOk} onClick={() => setStep(3)}>
                  NEXT →
                </Button>
              </div>
            </motion.div>
          ) : null}

          {step === 3 ? (
            <motion.div
              key="s3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-center">
                <p className="font-display text-xl font-bold uppercase tracking-wide text-white">
                  How hard did you go?
                </p>
              </div>
              <div className="grid gap-3">
                {[
                  { id: 'light', emoji: '💧', title: 'LIGHT', sub: 'Easy session, recovery pace', xp: 15 },
                  { id: 'moderate', emoji: '⚡', title: 'MODERATE', sub: 'Solid effort, pushed yourself', xp: 25 },
                  { id: 'intense', emoji: '🔥', title: 'INTENSE', sub: 'Maximum effort, left it all out there', xp: 40 },
                ].map((opt) => {
                  const on = intensity === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setIntensity(opt.id)}
                      className={[
                        'rounded-2xl border p-4 text-left transition-shadow',
                        on
                          ? 'border-[var(--neon-blue)] bg-[rgba(0,212,255,0.08)] shadow-[var(--glow-blue)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-card)]',
                      ].join(' ')}
                    >
                      <p className="font-display text-lg font-bold text-white">
                        {opt.emoji} {opt.title}
                      </p>
                      <p className="mt-1 font-body text-xs text-[var(--text-secondary)]">{opt.sub}</p>
                      <p className="mt-2 font-mono text-[10px] text-[var(--neon-gold)]">
                        {opt.xp} XP per attribute
                      </p>
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" variant="ghost" onClick={() => setStep(2)}>
                  ← Back
                </Button>
                <Button
                  className="flex-1 min-h-[48px]"
                  variant="primary"
                  disabled={submitting}
                  onClick={() => void runSubmit()}
                >
                  LOG WORKOUT →
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

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
                className="relative z-[1] text-center font-display text-4xl font-bold uppercase leading-none text-[var(--neon-green)] [text-shadow:var(--glow-green)] sm:text-5xl"
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
