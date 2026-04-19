import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import useAppStore from '../../store/useAppStore'
import { Button } from '../../components/ui/Button'
import { RadarChart } from '../../components/ui/RadarChart'
import { computeOVR, getRadarCategoryScores } from '../../lib/attributeMapping'
import {
  fetchLatestPlayerBuildForUser,
  generateArchetype,
  getNarrowedArchetypes,
  saveArchetypeToSupabase,
} from '../../lib/archetypeEngine'
import { supabase } from '../../lib/supabase'

const LOADING_LINES = [
  'SCANNING ATTRIBUTE PROFILE...',
  'CROSS-REFERENCING ARCHETYPES...',
  'ANALYZING PLAYER COMPS...',
  'FINALIZING BUILD...',
]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function TopAttrBars({ attributes }) {
  const top = useMemo(() => {
    return Object.entries(attributes || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [attributes])
  return (
    <div className="mt-6 grid grid-cols-3 gap-2">
      {top.map(([k, v]) => (
        <div key={k} className="text-center">
          <p className="font-mono text-[10px] uppercase text-[var(--text-muted)]">
            {k.replaceAll('_', ' ')}
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div
              className="h-full rounded-full bg-[var(--neon-blue)]"
              style={{ width: `${v}%` }}
            />
          </div>
          <p className="mt-0.5 font-mono text-xs text-[var(--neon-blue)]">{v}</p>
        </div>
      ))}
    </div>
  )
}

export function ArchetypeReveal() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const setCurrentBuild = useAppStore((s) => s.setCurrentBuild)

  const [displayName, setDisplayName] = useState('PLAYER')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [lineIdx, setLineIdx] = useState(0)
  const [toast, setToast] = useState('')

  const [result, setResult] = useState(null)
  const [revealStep, setRevealStep] = useState(0)
  const [ovrDisplay, setOvrDisplay] = useState(0)
  const [flipOpen, setFlipOpen] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => {
      setLineIdx((i) => (i + 1) % LOADING_LINES.length)
    }, 1500)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!user?.id) {
        queueMicrotask(() => {
          if (!cancelled) {
            setLoadError('Not signed in.')
            setLoading(false)
          }
        })
        return
      }

      setLoading(true)
      setLoadError('')
      try {
        let nameForCard = useAppStore.getState().onboardingData.username?.trim() || 'PLAYER'
        if (supabase) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .maybeSingle()
          nameForCard =
            prof?.username?.trim() ||
            useAppStore.getState().onboardingData.username?.trim() ||
            'PLAYER'
        }
        if (!cancelled) setDisplayName(nameForCard)

        let row = null
        const cb = useAppStore.getState().currentBuild
        if (cb?.id && cb?.attributes) {
          row = { ...cb }
        }
        if (!row?.attributes) {
          const fetched = await fetchLatestPlayerBuildForUser(user.id)
          if (fetched) row = fetched
        }
        if (!row?.attributes) {
          if (!cancelled) {
            setLoadError('No player build found. Finish onboarding first.')
            setLoading(false)
          }
          return
        }

        if (row.archetype && row.archetype_flavor_text) {
          const od = useAppStore.getState().onboardingData
          const pos = (od.position || 'SF').toUpperCase()
          const attrs =
            typeof row.attributes === 'object' && row.attributes !== null
              ? row.attributes
              : {}
          const pc = row.player_comps
          let playerComps = []
          let compReasons = []
          if (Array.isArray(pc)) {
            playerComps = pc
            compReasons = ['', '', '']
          } else if (pc && typeof pc === 'object') {
            playerComps = pc.names || []
            compReasons = pc.reasons || []
          }
          while (compReasons.length < 3) compReasons.push('')
          if (!cancelled) {
            setResult({
              archetype: row.archetype,
              flavorText: row.archetype_flavor_text,
              playerComps: playerComps.slice(0, 3),
              compReasons: compReasons.slice(0, 3),
              usedFallback: false,
              attributes: attrs,
              ovr: computeOVR(attrs, pos),
              pos,
              displayName: nameForCard,
            })
            setCurrentBuild(row)
            setLoading(false)
          }
          return
        }

        const attrs =
          typeof row.attributes === 'object' && row.attributes !== null
            ? row.attributes
            : {}
        const od = useAppStore.getState().onboardingData
        const pos = (od.position || 'SF').toUpperCase()

        const narrowed = getNarrowedArchetypes(attrs, pos)
        const gen = await generateArchetype(
          attrs,
          pos,
          od.heightInches,
          od.weightLbs,
          narrowed,
        )
        if (cancelled) return

        if (gen.usedFallback) {
          setToast('Using algorithmic archetype — AI unavailable')
          window.setTimeout(() => setToast(''), 4500)
        }

        await saveArchetypeToSupabase(row.id, {
          archetype: gen.archetype,
          flavorText: gen.flavorText,
          playerComps: gen.playerComps,
          compReasons: gen.compReasons,
        })
        if (cancelled) return

        setCurrentBuild({
          ...row,
          archetype: gen.archetype,
          archetype_flavor_text: gen.flavorText,
          player_comps: { names: gen.playerComps, reasons: gen.compReasons },
        })
        setResult({
          ...gen,
          attributes: attrs,
          ovr: computeOVR(attrs, pos),
          pos,
          displayName: nameForCard,
        })
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Could not generate archetype.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [user?.id, setCurrentBuild])

  useEffect(() => {
    if (!result) return
    let cancelled = false

    async function sequence() {
      setRevealStep(0)
      setFlipOpen(false)
      setOvrDisplay(0)
      await sleep(100)
      if (cancelled) return
      setRevealStep(1)
      await sleep(300)
      if (cancelled) return
      setRevealStep(2)
      const target = computeOVR(result.attributes, result.pos)
      const dur = 1200
      const t0 = performance.now()
      const tick = (now) => {
        if (cancelled) return
        const t = Math.min(1, (now - t0) / dur)
        const eased = 1 - (1 - t) ** 3
        setOvrDisplay(Math.round(target * eased))
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      await sleep(dur)
      if (cancelled) return
      setRevealStep(3)
      setFlipOpen(true)
      await sleep(800)
      if (cancelled) return
      setRevealStep(4)
      await sleep(400)
      if (cancelled) return
      setRevealStep(5)
      await sleep(600)
      if (cancelled) return
      setRevealStep(6)
    }

    sequence()
    return () => {
      cancelled = true
    }
  }, [result])

  const radarValues = useMemo(() => {
    if (!result?.attributes) return null
    return getRadarCategoryScores(result.attributes)
  }, [result])

  const cardName = result?.displayName || displayName

  if (loadError && !result) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg-primary)] px-6 text-center">
        <p className="font-body text-[var(--text-secondary)]">{loadError}</p>
        <Button className="mt-6" variant="secondary" onClick={() => navigate('/onboarding')}>
          Back to onboarding
        </Button>
      </div>
    )
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {toast ? (
        <div className="fixed left-1/2 top-16 z-[100] w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2 text-center font-body text-xs text-[var(--text-secondary)] shadow-[var(--glow-blue)]">
          {toast}
        </div>
      ) : null}

      <AnimatePresence>
        {loading ? (
          <motion.div
            key="load"
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[var(--bg-primary)]"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute left-1/2 top-0 h-[3px] w-[min(90vw,420px)] -translate-x-1/2 bg-[var(--neon-blue)] shadow-[var(--glow-blue)]"
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
              />
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--neon-blue)] opacity-20"
                  animate={{ scale: [0.4 + i * 0.2, 1.4 + i * 0.15], opacity: [0.35, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.35, ease: 'easeOut' }}
                />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={lineIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="relative z-10 px-6 text-center font-mono text-sm tracking-[0.2em] text-[var(--neon-blue)] [text-shadow:var(--glow-blue)]"
              >
                {LOADING_LINES[lineIdx]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!loading && result ? (
        <div className="relative mx-auto min-h-dvh w-full max-w-[480px] px-4 pb-16 pt-10">
          <AnimatePresence>
            {revealStep === 0 ? (
              <motion.div
                key="flash"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="pointer-events-none fixed inset-0 z-30 bg-white"
              />
            ) : null}
          </AnimatePresence>

          {revealStep >= 1 ? (
            <motion.div
              initial={{ y: -120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="flex justify-center"
            >
              <span className="rounded-full border border-[var(--neon-blue)] bg-[rgba(0,212,255,0.12)] px-8 py-3 font-display text-5xl font-black text-[var(--neon-blue)] [text-shadow:var(--glow-blue)]">
                {result.pos}
              </span>
            </motion.div>
          ) : null}

          {revealStep >= 2 ? (
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-10 text-center font-mono text-7xl font-bold tabular-nums text-[var(--neon-gold)] [text-shadow:var(--glow-gold)]"
            >
              {ovrDisplay}
            </motion.div>
          ) : null}

          {revealStep >= 3 ? (
            <motion.div
              className="mt-10 [perspective:1400px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="relative mx-auto w-full max-w-[400px]"
                initial={{ rotateY: 92 }}
                animate={{ rotateY: flipOpen ? 0 : 92 }}
                transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div
                  className="rounded-2xl border-2 border-[var(--neon-blue)] bg-gradient-to-b from-[var(--bg-card)] to-[var(--bg-secondary)] p-6 shadow-[var(--glow-blue)] [backface-visibility:hidden]"
                  style={{ WebkitBackfaceVisibility: 'hidden' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-[rgba(0,212,255,0.15)] px-3 py-1 font-display text-xs font-bold text-[var(--neon-blue)]">
                      {result.pos}
                    </span>
                    <span className="font-mono text-3xl font-bold text-[var(--neon-gold)]">
                      {computeOVR(result.attributes, result.pos)}
                    </span>
                  </div>
                  <h1 className="mt-4 text-center font-display text-3xl font-bold uppercase tracking-tight text-[var(--text-primary)]">
                    {cardName}
                  </h1>
                  <p className="mt-2 text-center font-display text-xl font-bold uppercase tracking-wide text-[var(--neon-blue)]">
                    {result.archetype}
                  </p>
                  <div className="neon-line my-4 opacity-80" />
                  <p className="text-center font-body text-sm italic leading-relaxed text-[var(--text-secondary)]">
                    {result.flavorText}
                  </p>
                  {radarValues ? (
                    <div className="mt-6">
                      <RadarChart values={radarValues} />
                    </div>
                  ) : null}
                  <TopAttrBars attributes={result.attributes} />
                </div>
              </motion.div>
            </motion.div>
          ) : null}

          {revealStep >= 4 ? (
            <div className="pointer-events-none absolute left-1/2 top-[42%] z-20 flex h-0 w-0 -translate-x-1/2 items-center justify-center">
              {Array.from({ length: 28 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full bg-[var(--neon-blue)]"
                  initial={{ x: 0, y: 0, opacity: 0.95, scale: 1 }}
                  animate={{
                    x: Math.cos((i / 28) * Math.PI * 2) * 130 * (0.55 + (i % 6) * 0.06),
                    y: Math.sin((i / 28) * Math.PI * 2) * 130 * (0.55 + (i % 6) * 0.06),
                    opacity: 0,
                    scale: 0.15,
                  }}
                  transition={{ duration: 0.85, ease: 'easeOut', delay: (i % 7) * 0.02 }}
                />
              ))}
            </div>
          ) : null}

          {revealStep >= 5 ? (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="mt-12"
            >
              <p className="mb-4 text-center font-display text-xs font-bold uppercase tracking-[0.35em] text-[var(--text-muted)]">
                SHADES OF
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {result.playerComps.map((name, idx) => (
                  <div
                    key={`${name}-${idx}`}
                    className="rounded-xl border border-[var(--neon-blue)]/50 bg-[var(--bg-elevated)]/80 p-3 text-center shadow-[0_0_16px_rgba(0,212,255,0.12)]"
                  >
                    <p className="font-display text-lg font-bold uppercase text-[var(--text-primary)]">
                      {name}
                    </p>
                    <p className="mt-2 font-body text-[11px] leading-snug text-[var(--text-secondary)]">
                      {result.compReasons[idx]}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : null}

          {revealStep >= 6 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-10"
            >
              <Button
                className="w-full"
                variant="primary"
                onClick={() => navigate('/onboarding/path-selection')}
              >
                CHOOSE YOUR PATH →
              </Button>
            </motion.div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
