import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import useAppStore from '../store/useAppStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { RadarChart } from '../components/ui/RadarChart'
import { fetchLatestPlayerBuildForUser } from '../lib/archetypeEngine'
import { computeOVR, getRadarCategoryScores } from '../lib/attributeMapping'
import { syncAttributesToStore } from '../lib/profile'
import {
  fetchWorkoutPlanForBuild,
  getDayForCurrentPlanIndex,
  getPlanWeekMeta,
  getPlanTotalDays,
} from '../lib/planGenerator'
import { supabase } from '../lib/supabase'
import { getXpProgressToNextPoint, getXpRemainingToNextPoint } from '../lib/xpSystem'

const CARD_SECTIONS = [
  {
    category: 'Athleticism',
    color: 'var(--neon-green)',
    attributes: [
      { key: 'speed', label: 'Speed', abbr: 'SPD' },
      { key: 'acceleration', label: 'Acceleration', abbr: 'ACCEL' },
      { key: 'agility', label: 'Agility', abbr: 'AGIL' },
      { key: 'vertical', label: 'Vertical', abbr: 'VERT' },
      { key: 'strength', label: 'Strength', abbr: 'STR' },
      { key: 'stamina', label: 'Stamina', abbr: 'STAM' },
      { key: 'durability', label: 'Durability', abbr: 'DUR' },
      { key: 'hustle', label: 'Hustle', abbr: 'HSTL' },
    ],
  },
  {
    category: 'Inside Scoring',
    color: 'var(--neon-blue)',
    attributes: [
      { key: 'layup', label: 'Layup', abbr: 'LAYUP' },
      { key: 'close_shot', label: 'Close Shot', abbr: 'CLOSE' },
      { key: 'driving_dunk', label: 'Driving Dunk', abbr: 'DUNK' },
      { key: 'standing_dunk', label: 'Standing Dunk', abbr: 'STDNK' },
      { key: 'hands', label: 'Hands', abbr: 'HANDS' },
      { key: 'draw_foul', label: 'Draw Foul', abbr: 'FOUL' },
      { key: 'post_control', label: 'Post Control', abbr: 'POSTC' },
      { key: 'post_hook', label: 'Post Hook', abbr: 'PHOOK' },
      { key: 'post_fade', label: 'Post Fade', abbr: 'PFADE' },
    ],
  },
  {
    category: 'Outside Scoring',
    color: 'var(--neon-purple)',
    attributes: [
      { key: 'three_point', label: 'Three-Point Shot', abbr: '3PT' },
      { key: 'mid_range', label: 'Mid-Range Shot', abbr: 'MID' },
      { key: 'moving_mid', label: 'Moving Mid', abbr: 'M-MID' },
      { key: 'moving_three', label: 'Moving Three', abbr: 'M-3' },
      { key: 'free_throw', label: 'Free Throw', abbr: 'FT' },
      { key: 'shot_iq', label: 'Shot IQ', abbr: 'SHOTIQ' },
      { key: 'ocnst', label: 'Off. Consistency', abbr: 'OCNST' },
    ],
  },
  {
    category: 'Playmaking',
    color: 'var(--neon-orange)',
    attributes: [
      { key: 'ball_handle', label: 'Ball Handle', abbr: 'BALL' },
      { key: 'pass_accuracy', label: 'Pass Accuracy', abbr: 'PASS' },
      { key: 'pass_iq', label: 'Pass IQ', abbr: 'PASSIQ' },
      { key: 'pass_vision', label: 'Pass Vision', abbr: 'VISION' },
      { key: 'speed_with_ball', label: 'Speed w/ Ball', abbr: 'SPD/B' },
    ],
  },
  {
    category: 'Defense',
    color: 'var(--neon-red)',
    attributes: [
      { key: 'perimeter_defense', label: 'Perimeter Defense', abbr: 'PD' },
      { key: 'interior_defense', label: 'Interior Defense', abbr: 'ID' },
      { key: 'block', label: 'Block', abbr: 'BLCK' },
      { key: 'steal', label: 'Steal', abbr: 'STEAL' },
      { key: 'dreb', label: 'Def. Rebound', abbr: 'DREB' },
      { key: 'oreb', label: 'Off. Rebound', abbr: 'OREB' },
      { key: 'help_defense_iq', label: 'Help Defense IQ', abbr: 'HDIQ' },
      { key: 'dcnst', label: 'Def. Consistency', abbr: 'DCNST' },
      { key: 'pass_perception', label: 'Pass Perception', abbr: 'PSPER' },
      { key: 'lateral_quickness', label: 'Lateral Quickness', abbr: 'LQ' },
    ],
  },
  {
    category: 'Intangibles',
    color: 'var(--neon-gold)',
    attributes: [{ key: 'intangibles', label: 'Intangibles', abbr: 'INTNG' }],
  },
]

const PATH_STYLES = {
  offensive: {
    label: 'Offensive',
    className: 'border-[var(--neon-orange)] text-[var(--neon-orange)] bg-[rgba(255,107,53,0.08)]',
  },
  defensive: {
    label: 'Defensive',
    className: 'border-[var(--neon-red)] text-[var(--neon-red)] bg-[rgba(255,51,85,0.08)]',
  },
  balanced: {
    label: 'Balanced',
    className: 'border-[var(--neon-blue)] text-[var(--neon-blue)] bg-[rgba(0,212,255,0.08)]',
  },
}

function normalizePath(p) {
  const k = String(p || '').toLowerCase()
  if (k === 'offensive' || k === 'defensive' || k === 'balanced') return k
  return 'balanced'
}

function AttrRow({ row, color, value, totalXp }) {
  const v = Math.min(99, Math.max(1, Math.round(Number(value) || 50)))
  const pct = (v / 99) * 100
  const sub = totalXp != null ? Math.round(getXpProgressToNextPoint(totalXp) * 100) : 0
  const remaining = totalXp != null ? getXpRemainingToNextPoint(totalXp) : null

  return (
    <motion.div
      className="border-b border-[var(--border-subtle)] py-3 last:border-0"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-body text-[10px] font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          {row.label}
        </span>
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="font-mono text-[10px] font-bold" style={{ color }}>
            {row.abbr}
          </span>
          <span className="font-mono text-sm font-bold text-white">{v}</span>
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 10px color-mix(in srgb, ${color} 45%, transparent)` }}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      </div>
      {totalXp != null ? (
        <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-[var(--bg-primary)]">
          <motion.div
            className="h-full rounded-full bg-[var(--neon-gold)]/80"
            initial={{ width: 0 }}
            whileInView={{ width: `${sub}%` }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05 }}
          />
        </div>
      ) : null}
      {remaining != null ? (
        <p className="mt-1 font-mono text-[9px] text-[var(--text-muted)]">
          +{remaining} XP to next point
        </p>
      ) : null}
    </motion.div>
  )
}

export function PlayerCard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentBuild = useAppStore((s) => s.currentBuild)
  const setCurrentBuild = useAppStore((s) => s.setCurrentBuild)
  const currentWorkoutPlan = useAppStore((s) => s.currentWorkoutPlan)
  const setCurrentWorkoutPlan = useAppStore((s) => s.setCurrentWorkoutPlan)
  const onboardingData = useAppStore((s) => s.onboardingData)

  const [displayName, setDisplayName] = useState('PLAYER')
  const [cardPosition, setCardPosition] = useState(
    () => String(onboardingData?.position || 'SF').toUpperCase(),
  )
  const [attrXpByKey, setAttrXpByKey] = useState({})
  const [liveAttrs, setLiveAttrs] = useState(null)
  const [attrsSyncing, setAttrsSyncing] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id) return
      setLoadError('')
      try {
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
          if (!cancelled) navigate('/onboarding', { replace: true })
          return
        }

        if (supabase) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('username, position')
            .eq('id', user.id)
            .maybeSingle()
          if (!cancelled && prof?.username?.trim()) setDisplayName(prof.username.trim().toUpperCase())
          if (!cancelled && prof?.position?.trim()) {
            setCardPosition(String(prof.position).trim().toUpperCase())
          }

          setAttrsSyncing(true)
          const syncRes = await syncAttributesToStore(
            user.id,
            build.id,
            setCurrentBuild,
            useAppStore.getState().currentBuild,
          )
          if (!cancelled) {
            if (syncRes?.xpByKey && Object.keys(syncRes.xpByKey).length) {
              setAttrXpByKey(syncRes.xpByKey)
            }
            if (syncRes?.attributes && Object.keys(syncRes.attributes).length) {
              setLiveAttrs(syncRes.attributes)
            } else {
              setLiveAttrs(
                typeof build.attributes === 'object' && build.attributes !== null ? build.attributes : {},
              )
            }
            setAttrsSyncing(false)
          }
        } else if (!cancelled) {
          setLiveAttrs(
            typeof build.attributes === 'object' && build.attributes !== null ? build.attributes : {},
          )
          setAttrsSyncing(false)
        }

        const existing = useAppStore.getState().currentWorkoutPlan
        if (!existing?.plan_data || existing.build_id !== build.id) {
          const fetched = await fetchWorkoutPlanForBuild(user.id, build.id)
          if (!cancelled && fetched) setCurrentWorkoutPlan(fetched)
        }
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Could not load player card.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.id, navigate, setCurrentBuild, setCurrentWorkoutPlan])

  const attrs = useMemo(() => {
    return liveAttrs || (typeof currentBuild?.attributes === 'object' && currentBuild.attributes !== null
      ? currentBuild.attributes
      : {})
  }, [liveAttrs, currentBuild])

  const liveOvr = useMemo(() => computeOVR(attrs, cardPosition), [attrs, cardPosition])

  const radarValues = useMemo(() => getRadarCategoryScores(attrs), [attrs])

  const planData = currentWorkoutPlan?.plan_data
  const currentDay = Number(currentWorkoutPlan?.current_day) || 1
  const weekMeta = useMemo(
    () => (planData ? getPlanWeekMeta(planData, currentDay) : { weekNumber: 1, totalWeeks: 1 }),
    [planData, currentDay],
  )
  const totalDays = planData ? getPlanTotalDays(planData) : 0
  const todayIdx = useMemo(() => {
    if (!planData) return currentDay
    return getDayForCurrentPlanIndex(planData, currentDay)?.indexOneBased ?? currentDay
  }, [planData, currentDay])

  const pathKey = normalizePath(currentBuild?.development_path)
  const pathStyle = PATH_STYLES[pathKey] || PATH_STYLES.balanced

  const comps = useMemo(() => {
    const pc = currentBuild?.player_comps
    if (Array.isArray(pc)) return pc.slice(0, 3)
    if (pc && typeof pc === 'object' && Array.isArray(pc.names)) return pc.names.slice(0, 3)
    return []
  }, [currentBuild])

  if (loadError && !currentBuild?.id) {
    return (
      <div className="min-h-dvh bg-[var(--bg-primary)] px-4 py-16 text-center">
        <p className="font-body text-[var(--text-secondary)]">{loadError}</p>
        <Button className="mt-6 min-h-[44px]" variant="secondary" onClick={() => navigate('/dashboard')}>
          Back to dashboard
        </Button>
      </div>
    )
  }

  if (attrsSyncing) {
    return (
      <div className="min-h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <header className="sticky top-0 z-20 flex h-14 min-h-[56px] items-center border-b border-[var(--border-subtle)] bg-[rgba(8,8,16,0.92)] px-3 backdrop-blur-md">
          <span className="mx-auto font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            MY PLAYER CARD
          </span>
        </header>
        <main className="mx-auto max-w-[480px] space-y-4 px-4 py-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="workout-skeleton h-14 w-full rounded-xl border border-[var(--border-subtle)]" />
          ))}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-20 flex h-12 items-center border-b border-[var(--border-subtle)] bg-[rgba(8,8,16,0.92)] px-3 backdrop-blur-md">
        <button
          type="button"
          className="min-h-[44px] min-w-[44px] rounded-lg font-mono text-sm text-[var(--text-secondary)]"
          onClick={() => navigate('/dashboard')}
        >
          ←
        </button>
        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          MY PLAYER CARD
        </span>
        <button
          type="button"
          className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-[var(--text-muted)] hover:text-white"
          aria-label="Share (coming soon)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
      </header>

      <main className="mx-auto max-w-[480px] space-y-8 px-4 py-6 pb-16">
        <Card glowing className="relative overflow-hidden p-5">
          <div className="court-lines pointer-events-none absolute inset-0 rounded-xl" />
          <p className="font-display text-3xl font-bold uppercase leading-none text-white">
            {displayName}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--neon-blue)] px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-[var(--neon-blue)]">
              {cardPosition}
            </span>
            <span className="font-display text-lg font-bold uppercase tracking-wide text-[var(--neon-blue)]">
              {currentBuild?.archetype || '—'}
            </span>
          </div>
          <div className="mt-4 inline-flex min-w-[4.5rem] items-center justify-center rounded-xl border border-[var(--neon-gold)] bg-[rgba(255,215,0,0.1)] px-4 py-2 font-mono text-3xl font-bold text-[var(--neon-gold)] shadow-[var(--glow-gold)]">
            {liveOvr}
          </div>
          <p className="mt-4 max-w-prose font-body text-sm italic text-[var(--text-secondary)]">
            {currentBuild?.archetype_flavor_text || 'Your story is still being written on the court.'}
          </p>
          {comps.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {comps.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-[10px] text-[var(--text-secondary)]"
                >
                  {name}
                </span>
              ))}
            </div>
          ) : null}
        </Card>

        <section>
          <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Profile radar
          </h2>
          <Card className="p-4">{radarValues ? <RadarChart values={radarValues} /> : null}</Card>
        </section>

        {CARD_SECTIONS.map((section) => (
          <section key={section.category}>
            <h3
              className="sticky top-12 z-10 -mx-1 mb-2 bg-[var(--bg-primary)]/95 py-2 font-display text-lg font-bold uppercase tracking-tight backdrop-blur-sm"
              style={{ color: section.color }}
            >
              {section.category}
            </h3>
            <Card className="divide-y divide-[var(--border-subtle)] px-3 py-1">
              {section.attributes.map((row) => (
                <AttrRow
                  key={row.key}
                  row={row}
                  color={section.color}
                  value={attrs[row.key]}
                  totalXp={attrXpByKey[row.key]}
                />
              ))}
            </Card>
          </section>
        ))}

        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 font-display text-xs font-bold uppercase tracking-wide ${pathStyle.className}`}
            >
              {pathStyle.label} path
            </span>
          </div>
          <p className="font-mono text-xs text-[var(--text-secondary)]">
            Week {weekMeta.weekNumber || 1} of {weekMeta.totalWeeks || '—'} · Day {todayIdx} of{' '}
            {totalDays || '—'}
          </p>
          <Button variant="ghost" className="w-full text-[var(--text-muted)]" disabled>
            CHANGE PATH
          </Button>
        </Card>
      </main>
    </div>
  )
}
