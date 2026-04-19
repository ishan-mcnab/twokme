import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import useAppStore from '../store/useAppStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { RadarChart } from '../components/ui/RadarChart'
import { fetchLatestPlayerBuildForUser, getNarrowedArchetypes } from '../lib/archetypeEngine'
import { checkForEvolution } from '../lib/evolutionDetector'
import {
  fetchWorkoutPlanForBuild,
  getDayForCurrentPlanIndex,
  getPlanTotalDays,
  getPlanWeekMeta,
  syncWorkoutPlanCalendarDay,
} from '../lib/planGenerator'
import { computeOVR, getRadarCategoryScores } from '../lib/attributeMapping'
import { syncAttributesToStore } from '../lib/profile'
import { supabase } from '../lib/supabase'
import { getStreakStatus } from '../lib/streakSystem'
import { getXpProgressToNextPoint } from '../lib/xpSystem'

function formatAttrLabel(key) {
  return String(key || '').replaceAll('_', ' ')
}

function weakestBars(attributes, n = 3) {
  if (!attributes || typeof attributes !== 'object') return []
  return Object.entries(attributes)
    .sort((a, b) => a[1] - b[1])
    .slice(0, n)
}

export function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentBuild = useAppStore((s) => s.currentBuild)
  const setCurrentBuild = useAppStore((s) => s.setCurrentBuild)
  const currentWorkoutPlan = useAppStore((s) => s.currentWorkoutPlan)
  const setCurrentWorkoutPlan = useAppStore((s) => s.setCurrentWorkoutPlan)
  const currentStreak = useAppStore((s) => s.currentStreak)
  const setCurrentStreak = useAppStore((s) => s.setCurrentStreak)
  const evolutionPending = useAppStore((s) => s.evolutionPending)
  const setEvolutionPending = useAppStore((s) => s.setEvolutionPending)
  const onboardingData = useAppStore((s) => s.onboardingData)

  const [loadError, setLoadError] = useState('')
  const [username, setUsername] = useState(onboardingData.username?.trim() || 'Player')
  const [alreadyLoggedToday, setAlreadyLoggedToday] = useState(false)
  const [streakBroken, setStreakBroken] = useState(false)
  const [attrXpByKey, setAttrXpByKey] = useState({})
  const [booting, setBooting] = useState(true)
  const [profileData, setProfileData] = useState(null)

  const position =
    currentBuild?.position ||
    onboardingData?.position ||
    profileData?.position ||
    'SF'

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id) {
        setBooting(false)
        return
      }
      setLoadError('')
      setBooting(true)
      try {
        if (supabase) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('username, position')
            .eq('id', user.id)
            .maybeSingle()
          if (!cancelled && prof?.username?.trim()) setUsername(prof.username.trim())
          if (!cancelled) setProfileData(prof ? { position: prof.position } : {})
        }

        let build = useAppStore.getState().currentBuild
        if (!build?.id) {
          const row = await fetchLatestPlayerBuildForUser(user.id)
          if (cancelled) return
          if (row) {
            build = row
            setCurrentBuild(row)
          }
        }

        if (!build?.id) {
          if (!cancelled) setLoadError('No player build yet. Finish onboarding first.')
          return
        }
        if (!cancelled) setLoadError('')

        let planRow = useAppStore.getState().currentWorkoutPlan
        if (!planRow?.plan_data || planRow.build_id !== build.id) {
          const fetchedPlan = await fetchWorkoutPlanForBuild(user.id, build.id)
          if (cancelled) return
          if (fetchedPlan) {
            planRow = fetchedPlan
            setCurrentWorkoutPlan(fetchedPlan)
          }
        }

        if (planRow?.id) {
          const rolled = await syncWorkoutPlanCalendarDay(planRow)
          if (!cancelled && rolled && rolled !== planRow) {
            planRow = rolled
            setCurrentWorkoutPlan(rolled)
          }
        }

        const planDay = Number(planRow?.current_day) || 1
        const streak = await getStreakStatus(user.id, build.id, planDay, {
          planLastLoggedDate: planRow?.last_logged_date,
        })
        if (!cancelled) {
          setCurrentStreak(streak.currentStreak)
          setAlreadyLoggedToday(streak.alreadyLoggedToday)
          setStreakBroken(streak.streakBroken)
        }

        if (supabase) {
          const syncRes = await syncAttributesToStore(
            user.id,
            build.id,
            setCurrentBuild,
            useAppStore.getState().currentBuild,
          )
          if (!cancelled && syncRes?.xpByKey && Object.keys(syncRes.xpByKey).length) {
            setAttrXpByKey(syncRes.xpByKey)
          }
        }

      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Could not load dashboard.')
      } finally {
        if (!cancelled) setBooting(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [
    user?.id,
    currentBuild?.id,
    currentWorkoutPlan?.current_day,
    currentWorkoutPlan?.id,
    currentWorkoutPlan?.last_logged_date,
    currentWorkoutPlan?.last_plan_roll_date,
    setCurrentBuild,
    setCurrentWorkoutPlan,
    setCurrentStreak,
  ])

  const planData = currentWorkoutPlan?.plan_data
  const currentDay = Number(currentWorkoutPlan?.current_day) || 1

  const today = useMemo(() => {
    if (!planData) return null
    return getDayForCurrentPlanIndex(planData, currentDay)
  }, [planData, currentDay])

  const totalDays = useMemo(() => (planData ? getPlanTotalDays(planData) : 0), [planData])
  const weekMeta = useMemo(
    () => (planData ? getPlanWeekMeta(planData, currentDay) : { weekNumber: 0, totalWeeks: 0 }),
    [planData, currentDay],
  )

  const completedDays =
    totalDays > 0 ? Math.min(totalDays, Math.max(0, currentDay - 1)) : 0
  const planPct =
    totalDays > 0 ? Math.min(100, Math.round((completedDays / totalDays) * 100)) : 0
  const planComplete = totalDays > 0 && currentDay > totalDays

  const radarValues = useMemo(() => {
    if (!currentBuild?.attributes) return null
    return getRadarCategoryScores(currentBuild.attributes)
  }, [currentBuild])

  const liveOvr = useMemo(() => {
    const attrs =
      typeof currentBuild?.attributes === 'object' && currentBuild.attributes !== null
        ? currentBuild.attributes
        : {}
    return computeOVR(attrs, position)
  }, [currentBuild, onboardingData, profileData, position])

  const weakBars = useMemo(
    () => weakestBars(currentBuild?.attributes, 3),
    [currentBuild?.attributes],
  )

  const initial = (username || 'P').charAt(0).toUpperCase()

  const triggerDevEvolution = useCallback(() => {
    const build = useAppStore.getState().currentBuild
    if (!build?.id) return
    const attrs =
      typeof build.attributes === 'object' && build.attributes !== null ? build.attributes : {}
    const pos = String(
      build?.position || onboardingData?.position || profileData?.position || 'SF',
    ).toUpperCase()
    const candidates = getNarrowedArchetypes(attrs, pos)
    const currentRow = candidates.find((c) => c.name === build.archetype)
    const scoreGap =
      candidates[0] && currentRow != null ? candidates[0].score - currentRow.score : null

    const result = checkForEvolution(build, attrs, pos)
    console.log('[dev evolution]', {
      checkForEvolution: result,
      topCandidate: candidates[0],
      currentArchetypeRow: currentRow,
      scoreGap,
      candidatesPreview: candidates.slice(0, 5),
    })

    const oldOvr = computeOVR(attrs, pos)
    const newOvr = Math.min(99, Math.round(oldOvr + 4))

    if (result) {
      setEvolutionPending(true, {
        newArchetype: result.newArchetype,
        oldArchetype: result.oldArchetype,
        scoreDiff: result.scoreDiff,
        newScore: result.newScore,
        oldOvr,
        newOvr,
        prevAttributes: { ...attrs },
      })
    } else {
      const top = candidates[0]
      if (!top?.name) {
        console.warn('[dev evolution] no top candidate from getNarrowedArchetypes')
        return
      }
      setEvolutionPending(true, {
        newArchetype: top.name,
        oldArchetype: build.archetype,
        scoreDiff: 999,
        newScore: top.score,
        oldOvr,
        newOvr,
        prevAttributes: { ...attrs },
      })
    }
  }, [onboardingData, profileData, setEvolutionPending])

  const day = today?.day
  const isRestDay = day?.type === 'rest'
  const isWorkoutDay = day && (day.type === 'workout' || day.type === 'active_recovery')

  if (loadError && !currentBuild?.id) {
    return (
      <div className="min-h-dvh bg-[var(--bg-primary)] px-4 py-16 text-center">
        <p className="font-body text-[var(--text-secondary)]">{loadError}</p>
        <Button className="mt-6 min-h-[44px]" variant="secondary" onClick={() => navigate('/onboarding')}>
          Go to onboarding
        </Button>
      </div>
    )
  }

  if (booting && currentBuild?.id) {
    return (
      <div className="min-h-dvh bg-[var(--bg-primary)] px-4 py-8 text-[var(--text-primary)]">
        <div className="mx-auto max-w-[480px] space-y-4">
          <div className="workout-skeleton h-10 w-3/4 max-w-[280px] rounded-lg" />
          <div className="workout-skeleton h-24 w-full rounded-2xl" />
          <div className="workout-skeleton h-40 w-full rounded-2xl" />
          <div className="workout-skeleton h-32 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[rgba(8,8,16,0.92)] backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[480px] items-center justify-between px-4">
          <span className="font-display text-lg font-bold tracking-tight text-white">TwoKMe</span>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--neon-blue)] font-display text-sm font-bold text-[var(--neon-blue)] shadow-[var(--glow-blue)]"
            aria-hidden
          >
            {initial}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[480px] space-y-8 px-4 py-8 pb-16">
        <section>
          <h1 className="font-display text-3xl font-bold uppercase leading-tight tracking-tight text-white">
            WELCOME BACK, {username.toUpperCase()}
          </h1>
          <p className="mt-2 font-display text-xl font-bold uppercase tracking-wide text-[var(--neon-blue)]">
            {currentBuild?.archetype || 'Your build'}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--neon-gold)] bg-[rgba(255,215,0,0.08)] px-4 py-1.5 font-mono text-sm font-bold text-[var(--neon-gold)] shadow-[var(--glow-gold)]">
            OVR {liveOvr}
          </div>
          {import.meta.env.DEV && currentBuild?.id ? (
            <div className="mt-4 rounded-xl border border-dashed border-[var(--neon-purple)]/60 bg-[rgba(123,47,255,0.06)] p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Dev only
              </p>
              <Button className="mt-2 w-full" variant="secondary" type="button" onClick={triggerDevEvolution}>
                Trigger evolution (test)
              </Button>
            </div>
          ) : null}
        </section>

        {evolutionPending ? (
          <motion.div
            className="rounded-2xl border-2 border-[var(--neon-gold)] bg-[var(--bg-card)] p-5"
            animate={{
              boxShadow: [
                '0 0 16px rgba(255, 215, 0, 0.35)',
                '0 0 32px rgba(255, 215, 0, 0.55)',
                '0 0 16px rgba(255, 215, 0, 0.35)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <p className="font-display text-sm font-bold uppercase tracking-wide text-[var(--neon-gold)]">
              ⚡ YOUR ARCHETYPE IS EVOLVING
            </p>
            <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">
              You&apos;ve outgrown your current build.
            </p>
            <Button className="mt-4 w-full" variant="primary" onClick={() => navigate('/evolution')}>
              SEE YOUR EVOLUTION →
            </Button>
          </motion.div>
        ) : null}

        {!planData ? (
          <Card className="p-6 text-center">
            <p className="font-display text-lg font-bold uppercase tracking-wide text-white">NO ACTIVE PLAN</p>
            <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">
              Start your combine to generate a plan and unlock daily workouts.
            </p>
            <Button className="mt-6 min-h-[44px] w-full" variant="primary" onClick={() => navigate('/onboarding')}>
              START YOUR COMBINE →
            </Button>
            {currentBuild?.id ? (
              <Button
                className="mt-3 min-h-[44px] w-full border border-dashed border-[var(--border-subtle)] text-[var(--neon-blue)]"
                variant="ghost"
                onClick={() => navigate('/custom-workout')}
              >
                LOG CUSTOM WORKOUT →
              </Button>
            ) : null}
          </Card>
        ) : planComplete ? (
          <Card glowing className="p-6 text-center">
            <p className="font-display text-2xl font-bold uppercase tracking-tight text-[var(--neon-gold)]">
              PLAN COMPLETE 🏆
            </p>
            <p className="mt-3 font-body text-sm text-[var(--text-secondary)]">
              You finished every day in this plan. Run the combine again to chart a new path.
            </p>
            <Button className="mt-6 min-h-[44px] w-full" variant="primary" onClick={() => navigate('/onboarding')}>
              START A NEW PLAN →
            </Button>
            {currentBuild?.id ? (
              <Button
                className="mt-3 min-h-[44px] w-full border border-dashed border-[var(--border-subtle)] text-[var(--neon-blue)]"
                variant="ghost"
                onClick={() => navigate('/custom-workout')}
              >
                LOG CUSTOM WORKOUT →
              </Button>
            ) : null}
          </Card>
        ) : (
          <Card glowing className="p-5">
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">
              Today&rsquo;s session
            </p>
            <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">
              Day {today?.indexOneBased ?? currentDay} of {totalDays || '—'}
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold uppercase tracking-tight text-white">
              {day?.workoutName || 'Workout'}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(day?.focusAttributes || []).slice(0, 6).map((attr) => (
                <span
                  key={attr}
                  className="rounded-full border border-[var(--neon-blue)]/40 bg-[rgba(0,212,255,0.08)] px-2.5 py-1 font-mono text-[10px] uppercase text-[var(--neon-blue)]"
                >
                  {formatAttrLabel(attr)}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 font-body text-xs text-[var(--text-secondary)]">
              <span className="uppercase">Intensity: {day?.intensity ?? '—'}</span>
              <span>·</span>
              <span>{day?.durationMinutes != null ? `${day.durationMinutes} min` : '—'}</span>
              {day?.environment ? (
                <>
                  <span>·</span>
                  <span className="uppercase">{day.environment}</span>
                </>
              ) : null}
            </div>
            {isRestDay ? (
              <>
                <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-center">
                  <p className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    REST DAY
                  </p>
                  <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">{day?.coachNote}</p>
                </div>
                {currentBuild?.id ? (
                  <Button
                    className="mt-4 min-h-[44px] w-full border border-dashed border-[var(--border-subtle)] text-[var(--neon-blue)]"
                    variant="ghost"
                    onClick={() => navigate('/custom-workout')}
                  >
                    LOG CUSTOM WORKOUT →
                  </Button>
                ) : null}
              </>
            ) : isWorkoutDay && alreadyLoggedToday ? (
              <>
                <p className="mt-6 text-center font-mono text-sm font-bold text-[var(--neon-green)]">
                  ✓ LOGGED TODAY
                </p>
                {currentBuild?.id ? (
                  <Button
                    className="mt-4 min-h-[44px] w-full border border-dashed border-[var(--border-subtle)] text-[var(--neon-blue)]"
                    variant="ghost"
                    onClick={() => navigate('/custom-workout')}
                  >
                    LOG ANOTHER WORKOUT →
                  </Button>
                ) : null}
              </>
            ) : isWorkoutDay ? (
              <>
                <Button className="mt-6 min-h-[44px] w-full" variant="primary" onClick={() => navigate('/workout')}>
                  START WORKOUT →
                </Button>
                {currentBuild?.id ? (
                  <Button
                    className="mt-3 min-h-[44px] w-full border border-dashed border-[var(--border-subtle)] text-[var(--neon-blue)]"
                    variant="ghost"
                    onClick={() => navigate('/custom-workout')}
                  >
                    LOG CUSTOM WORKOUT →
                  </Button>
                ) : null}
              </>
            ) : null}
          </Card>
        )}

        <section>
          <div className="flex items-end justify-between gap-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Attribute overview
            </h3>
            <Link
              to="/player-card"
              className="font-display text-xs font-bold uppercase tracking-wide text-[var(--text-primary)] underline-offset-4 hover:underline"
            >
              VIEW FULL CARD →
            </Link>
          </div>
          <Card className="mt-3 p-4">
            {radarValues ? <RadarChart values={radarValues} /> : null}
            <p className="mt-4 font-display text-[10px] font-bold uppercase tracking-wider text-[var(--neon-red)]">
              Growth edges
            </p>
            <div className="mt-2 space-y-2">
              {weakBars.map(([k, v]) => {
                const tx = attrXpByKey[k]
                const sub =
                  tx != null ? Math.round(getXpProgressToNextPoint(tx) * 100) : 0
                return (
                  <div key={k}>
                    <div className="flex justify-between font-mono text-[10px] uppercase text-[var(--text-muted)]">
                      <span>{formatAttrLabel(k)}</span>
                      <span>{v}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <motion.div
                        className="h-full rounded-full bg-[var(--neon-red)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${v}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    {tx != null ? (
                      <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-[var(--bg-primary)]">
                        <motion.div
                          className="h-full rounded-full bg-[var(--neon-gold)]/70"
                          initial={{ width: 0 }}
                          animate={{ width: `${sub}%` }}
                          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.05 }}
                        />
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </Card>
        </section>

        <section>
          <p className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Plan progress
          </p>
          <p className="mt-1 font-display text-lg font-bold text-white">
            WEEK {weekMeta.weekNumber || 1} OF {weekMeta.totalWeeks || '—'}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div
              className="h-full rounded-full bg-[var(--neon-green)] shadow-[var(--glow-green)]"
              style={{ width: `${planPct}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-xs text-[var(--text-secondary)]">
            {completedDays} of {totalDays || '—'} days in plan footprint
          </p>
        </section>

        <section className="flex flex-col items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] py-6">
          <span className="text-3xl" aria-hidden>
            🔥
          </span>
          <p className="mt-2 font-mono text-3xl font-bold text-[var(--neon-gold)] [text-shadow:var(--glow-gold)]">
            {currentStreak}
          </p>
          <p className="mt-1 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Day streak
          </p>
          {currentStreak === 0 && streakBroken ? (
            <p className="mt-2 max-w-[240px] text-center font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              START A NEW STREAK
            </p>
          ) : null}
        </section>
      </main>
    </div>
  )
}
