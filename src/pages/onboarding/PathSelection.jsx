import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import useAppStore from '../../store/useAppStore'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { fetchLatestPlayerBuildForUser } from '../../lib/archetypeEngine'
import { updateDevelopmentPath } from '../../lib/planGenerator'

const PATHS = [
  {
    id: 'offensive',
    icon: '⚡',
    colorVar: '--neon-green',
    glowVar: '--glow-green',
    name: 'OFFENSIVE FOCUSED',
    description:
      'Put points on the board. This path hammers your scoring arsenal — shooting, finishing, and creating your own shot.',
    targets: ['Inside Scoring', 'Outside Scoring', 'Playmaking'],
    mostLike: 'Scorers, Shot Creators, Slashers',
  },
  {
    id: 'defensive',
    icon: '🛡',
    colorVar: '--neon-red',
    glowVar: '--glow-red',
    name: 'DEFENSIVE FOCUSED',
    description:
      'Lock everybody up. This path builds you into a nightmare to play against — on and off the ball.',
    targets: ['Defense', 'Athleticism', 'Intangibles'],
    mostLike: 'Lockdowns, Glass Cleaners, Anchors',
  },
  {
    id: 'balanced',
    icon: '⚖',
    colorVar: '--neon-blue',
    glowVar: '--glow-blue',
    name: 'BALANCED',
    description:
      'Grow in every direction. This path spreads the work across all facets of your game for complete player development.',
    targets: ['All categories', 'Weakness-focused', 'Full player build'],
    mostLike: 'Two-Way Players, All-Around Stars',
  },
]

export function PathSelection() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentBuild = useAppStore((s) => s.currentBuild)
  const setOnboardingData = useAppStore((s) => s.setOnboardingData)
  const setCurrentBuild = useAppStore((s) => s.setCurrentBuild)

  const [selected, setSelected] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function ensureBuild() {
      if (!user?.id) return
      if (currentBuild?.id) return
      const row = await fetchLatestPlayerBuildForUser(user.id)
      if (!cancelled && row) setCurrentBuild(row)
    }
    ensureBuild()
    return () => {
      cancelled = true
    }
  }, [user?.id, currentBuild?.id, setCurrentBuild])

  const onConfirm = useCallback(async () => {
    if (!selected || !user?.id || !currentBuild?.id) return
    setBusy(true)
    setLoadError('')
    try {
      await updateDevelopmentPath(currentBuild.id, selected)
      setOnboardingData({ developmentPath: selected })
      setCurrentBuild({ ...currentBuild, development_path: selected })
      navigate('/onboarding/generating-plan')
    } catch (e) {
      setLoadError(e?.message || 'Could not save path.')
    } finally {
      setBusy(false)
    }
  }, [selected, user?.id, currentBuild, setOnboardingData, setCurrentBuild, navigate])

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <motion.div
          className="absolute -left-1/4 top-0 h-[60%] w-[80%] rounded-full bg-[var(--neon-blue)] blur-[120px]"
          animate={{ x: [0, 40, 0], opacity: [0.15, 0.28, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-1/4 bottom-0 h-[50%] w-[70%] rounded-full bg-[var(--neon-purple)] blur-[100px]"
          animate={{ x: [0, -30, 0], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[480px] px-4 pb-16 pt-10">
        <p className="text-center font-display text-xs font-bold uppercase tracking-[0.35em] text-[var(--text-muted)]">
          CHOOSE YOUR PATH
        </p>
        <h1 className="mt-3 text-center font-display text-3xl font-bold uppercase leading-tight tracking-tight text-white">
          HOW DO YOU WANT TO LEVEL UP?
        </h1>
        <p className="mx-auto mt-3 max-w-[42ch] text-center font-body text-sm leading-relaxed text-[var(--text-secondary)]">
          Your path determines how your daily workouts are structured and which attributes get
          prioritized.
        </p>

        {!currentBuild?.id ? (
          <p className="mt-10 text-center font-body text-sm text-[var(--text-secondary)]">
            Loading your build…
          </p>
        ) : null}

        <div className="mt-10 flex flex-col gap-4">
          {PATHS.map((p) => {
            const isSel = selected === p.id
            return (
              <motion.div key={p.id} layout transition={{ type: 'spring', stiffness: 380, damping: 28 }}>
                <Card
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelected(p.id)
                    }
                  }}
                  className={[
                    'cursor-pointer p-5 text-left transition-[opacity,transform,box-shadow,border-color] duration-200',
                    isSel
                      ? 'scale-[1.02] border-2 shadow-[var(--glow-blue)]'
                      : 'opacity-[0.6] hover:opacity-90',
                  ].join(' ')}
                  style={
                    isSel
                      ? {
                          borderColor: `var(${p.colorVar})`,
                          boxShadow: `var(${p.glowVar}), 0 0 0 1px var(${p.colorVar})`,
                        }
                      : undefined
                  }
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl leading-none">{p.icon}</span>
                    <div className="min-w-0 flex-1">
                      <h2
                        className="font-display text-xl font-bold uppercase tracking-wide"
                        style={{ color: `var(${p.colorVar})` }}
                      >
                        {p.name}
                      </h2>
                      <p className="mt-2 font-body text-sm leading-relaxed text-[var(--text-secondary)]">
                        {p.description}
                      </p>
                      <p className="mt-3 font-display text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Primary targets
                      </p>
                      <ul className="mt-1 list-inside list-disc font-body text-xs text-[var(--text-secondary)]">
                        {p.targets.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                      <p className="mt-3 font-body text-xs text-[var(--text-secondary)]">
                        <span className="font-display font-bold text-[var(--text-primary)]">Most like: </span>
                        {p.mostLike}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {loadError ? (
          <p className="mt-4 text-center font-body text-sm text-[var(--neon-red)]">{loadError}</p>
        ) : null}

        <AnimatePresence>
          {selected ? (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className="mt-10"
            >
              <Button className="w-full" variant="primary" disabled={busy} onClick={onConfirm}>
                {busy ? 'SAVING…' : 'LOCK IN PATH →'}
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
