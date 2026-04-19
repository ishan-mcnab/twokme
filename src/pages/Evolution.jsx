import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import useAppStore from '../store/useAppStore'
import { Button } from '../components/ui/Button'
import { RadarChart } from '../components/ui/RadarChart'
import {
  fetchLatestPlayerBuildForUser,
  generateEvolutionFlavor,
  saveArchetypeToSupabase,
} from '../lib/archetypeEngine'
import { computeOVR, getRadarCategoryScores } from '../lib/attributeMapping'
import { supabase } from '../lib/supabase'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function GoldParticles() {
  const n = 28
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: n }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-[var(--neon-gold)] opacity-70 shadow-[var(--glow-gold)]"
          style={{ left: `${(i * 37) % 100}%`, bottom: '-4%' }}
          animate={{ y: [0, -900], opacity: [0, 1, 0.6, 0], x: [0, (i % 5) * 8 - 16] }}
          transition={{ duration: 4 + (i % 4), repeat: Infinity, delay: i * 0.12, ease: 'linear' }}
        />
      ))}
    </div>
  )
}

function BurstGold() {
  const n = 26
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative h-0 w-0">
        {Array.from({ length: n }).map((_, i) => {
          const angle = (i / n) * Math.PI * 2
          const dist = 100 + (i % 6) * 14
          return (
            <motion.span
              key={i}
              className="absolute left-0 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--neon-gold)] shadow-[var(--glow-gold)]"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                opacity: 0,
                scale: 0.15,
              }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
            />
          )
        })}
      </div>
    </div>
  )
}

export function Evolution() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentBuild = useAppStore((s) => s.currentBuild)
  const setCurrentBuild = useAppStore((s) => s.setCurrentBuild)
  const setEvolutionPending = useAppStore((s) => s.setEvolutionPending)
  const onboardingData = useAppStore((s) => s.onboardingData)

  const [pendingSnapshot] = useState(() => useAppStore.getState().pendingEvolution)
  const [phase, setPhase] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [flavor, setFlavor] = useState({ flavorText: '', playerComps: [], compReasons: [] })
  const [beat, setBeat] = useState(0)

  const attrs = useMemo(() => {
    if (typeof currentBuild?.attributes === 'object' && currentBuild.attributes !== null) {
      return currentBuild.attributes
    }
    return {}
  }, [currentBuild?.attributes])

  const position = (onboardingData?.position || 'SF').toUpperCase()
  const radarNew = useMemo(() => getRadarCategoryScores(attrs), [attrs])

  useEffect(() => {
    if (!pendingSnapshot) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate, pendingSnapshot])

  useEffect(() => {
    if (!pendingSnapshot || !user?.id) return
    let cancelled = false

    async function persistAndStart() {
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
        navigate('/dashboard', { replace: true })
        return
      }

      let pos = position
      if (supabase) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('position')
          .eq('id', user.id)
          .maybeSingle()
        if (prof?.position) pos = String(prof.position).toUpperCase()
      }

      const mergedAttrs =
        typeof build.attributes === 'object' && build.attributes !== null ? { ...build.attributes } : {}

      try {
        const hi = useAppStore.getState().onboardingData.heightInches
        const gen = await generateEvolutionFlavor(
          pendingSnapshot.newArchetype,
          mergedAttrs,
          pos,
          hi ?? null,
          [],
        )
        if (cancelled) return
        setFlavor(gen)

        const ovr = computeOVR(mergedAttrs, pos)
        await saveArchetypeToSupabase(build.id, {
          archetype: pendingSnapshot.newArchetype,
          flavorText: gen.flavorText,
          playerComps: gen.playerComps,
          compReasons: gen.compReasons,
          overall_rating: ovr,
        })
        if (cancelled) return

        setCurrentBuild({
          ...build,
          archetype: pendingSnapshot.newArchetype,
          archetype_flavor_text: gen.flavorText,
          player_comps: { names: gen.playerComps, reasons: gen.compReasons },
          overall_rating: ovr,
        })
        setEvolutionPending(false, null)
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Could not save evolution.')
        return
      }

      if (cancelled) return
      setPhase('intro')
    }

    void persistAndStart()
    return () => {
      cancelled = true
    }
  }, [user?.id, navigate, setCurrentBuild, setEvolutionPending, pendingSnapshot, position])

  useEffect(() => {
    if (phase !== 'intro') return
    let cancelled = false
    async function run() {
      await sleep(2000)
      if (cancelled) return
      setBeat(1)
      await sleep(900)
      if (cancelled) return
      setBeat(2)
      await sleep(700)
      if (cancelled) return
      setBeat(3)
      await sleep(650)
      if (cancelled) return
      setBeat(4)
      await sleep(900)
      if (cancelled) return
      setBeat(5)
      await sleep(800)
      if (cancelled) return
      setBeat(6)
      await sleep(1200)
      if (cancelled) return
      setBeat(7)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [phase])

  if (!pendingSnapshot) {
    return null
  }

  const posForOvr = String(currentBuild?.position || onboardingData?.position || 'SF').toUpperCase()

  if (loadError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg-primary)] px-6 text-center">
        <p className="font-body text-[var(--text-secondary)]">{loadError}</p>
        <Button className="mt-6" variant="primary" onClick={() => navigate('/dashboard', { replace: true })}>
          Back to dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <GoldParticles />

      <AnimatePresence>
        {phase === 'loading' ? (
          <motion.div
            key="load"
            className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-[var(--bg-primary)]"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
              Sealing your evolution…
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {phase === 'intro' && beat === 0 ? (
        <motion.div
          className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1
            className="font-display text-[clamp(2rem,8vw,3.5rem)] font-bold uppercase leading-none text-[var(--neon-gold)] [text-shadow:var(--glow-gold)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            YOUR GAME HAS EVOLVED
          </motion.h1>
          <motion.p
            className="mt-6 max-w-md font-body text-sm text-[var(--text-secondary)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.7 }}
          >
            The grind paid off. Your archetype has changed.
          </motion.p>
        </motion.div>
      ) : null}

      {phase === 'intro' && beat >= 1 ? (
        <div className="relative z-20 flex min-h-dvh flex-col items-center justify-center px-4 pb-32 pt-10">
          {beat >= 1 && beat <= 2 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-[340px] rounded-2xl border border-[var(--text-muted)] bg-[var(--bg-card)] p-6 opacity-70"
            >
              <p className="text-center font-display text-xs uppercase text-[var(--text-muted)]">Previous</p>
              <p className="mt-3 text-center font-display text-3xl font-bold uppercase text-[var(--text-secondary)]">
                {pendingSnapshot.oldArchetype}
              </p>
            </motion.div>
          ) : null}

          {beat === 2 ? (
            <motion.div
              className="pointer-events-none absolute left-0 right-0 top-[40%] z-30 h-1.5 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="h-full w-full bg-gradient-to-r from-transparent via-[var(--neon-gold)] to-transparent shadow-[var(--glow-gold)]"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 0.55, ease: 'easeInOut' }}
              />
            </motion.div>
          ) : null}

          {beat === 3 ? (
            <motion.div
              initial={{ scale: 1, opacity: 0.85, x: 0 }}
              animate={{
                scale: 1.12,
                opacity: 0,
                x: [0, -10, 10, -8, 8, 0],
              }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="w-full max-w-[340px] rounded-2xl border border-[var(--text-muted)] bg-[var(--bg-card)] p-6 opacity-70"
            >
              <p className="text-center font-display text-3xl font-bold uppercase text-[var(--text-secondary)]">
                {pendingSnapshot.oldArchetype}
              </p>
            </motion.div>
          ) : null}

          {beat >= 4 ? (
            <motion.div
              initial={{ y: '-120%', scale: 1.25, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="relative z-40 w-full max-w-[360px] rounded-2xl border-2 border-[var(--neon-gold)] bg-[var(--bg-card)] p-6 shadow-[var(--glow-gold)]"
            >
              {beat >= 5 ? <BurstGold /> : null}
              <p className="relative z-[1] text-center font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                NEW ARCHETYPE
              </p>
              <p className="relative z-[1] mt-2 text-center font-display text-3xl font-bold uppercase leading-none text-[var(--neon-gold)] [text-shadow:var(--glow-gold)]">
                {pendingSnapshot.newArchetype}
              </p>
              <p className="relative z-[1] mt-4 text-center font-body text-sm italic text-[var(--text-secondary)]">
                {flavor.flavorText}
              </p>
              <div className="relative z-[1] mt-4 flex flex-wrap justify-center gap-2">
                {(flavor.playerComps || []).map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-[var(--neon-gold)]/40 bg-[rgba(255,215,0,0.08)] px-2 py-0.5 font-mono text-[9px] text-[var(--neon-gold)]"
                  >
                    {name}
                  </span>
                ))}
              </div>
              <div className="relative z-[1] mt-5">
                <RadarChart values={radarNew} />
              </div>
            </motion.div>
          ) : null}

          {beat >= 6 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 flex items-end justify-center gap-8 font-mono"
            >
              <div className="text-center">
                <p className="text-[10px] uppercase text-[var(--text-muted)]">Before</p>
                <p className="text-2xl text-[var(--text-muted)]">
                  {pendingSnapshot.prevAttributes != null
                    ? computeOVR(
                        typeof pendingSnapshot.prevAttributes === 'object' &&
                          pendingSnapshot.prevAttributes !== null
                          ? pendingSnapshot.prevAttributes
                          : {},
                        posForOvr,
                      )
                    : typeof pendingSnapshot.oldOvr === 'number'
                      ? pendingSnapshot.oldOvr
                      : '—'}
                </p>
              </div>
              <p className="pb-1 text-2xl text-[var(--neon-gold)]">→</p>
              <div className="text-center">
                <p className="text-[10px] uppercase text-[var(--text-muted)]">After</p>
                <p className="text-3xl font-bold text-[var(--neon-gold)] [text-shadow:var(--glow-gold)]">
                  {computeOVR(attrs, posForOvr)}
                </p>
              </div>
            </motion.div>
          ) : null}

          {beat >= 7 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="fixed bottom-10 left-0 right-0 z-50 flex justify-center px-6"
            >
              <Button className="w-full max-w-[360px]" variant="primary" onClick={() => navigate('/dashboard')}>
                KEEP GRINDING →
              </Button>
            </motion.div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
