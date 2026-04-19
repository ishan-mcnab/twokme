import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import useAppStore from '../../store/useAppStore'
import { fetchLatestPlayerBuildForUser } from '../../lib/archetypeEngine'
import { generateWorkoutPlan } from '../../lib/planGenerator'

function pathAccent(developmentPath) {
  const p = String(developmentPath || '').toLowerCase()
  if (p === 'offensive') return 'var(--neon-green)'
  if (p === 'defensive') return 'var(--neon-red)'
  return 'var(--neon-blue)'
}

function pathLabel(developmentPath) {
  const p = String(developmentPath || '').toLowerCase()
  if (p === 'offensive') return 'Offensive Path'
  if (p === 'defensive') return 'Defensive Path'
  return 'Balanced Path'
}

export function GeneratingPlan() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const onboardingData = useAppStore((s) => s.onboardingData)
  const currentBuild = useAppStore((s) => s.currentBuild)
  const setCurrentBuild = useAppStore((s) => s.setCurrentBuild)

  const [isComplete, setIsComplete] = useState(false)
  const called = useRef(false)

  const accent = pathAccent(onboardingData.developmentPath)
  const username =
    onboardingData.username?.trim() || onboardingData.name?.trim() || 'Player'
  const archetype = currentBuild?.archetype || 'Build'

  useEffect(() => {
    if (called.current) return
    called.current = true

    let completed = false
    let safetyId = null

    const finish = () => {
      if (completed) return
      completed = true
      if (safetyId != null) {
        window.clearTimeout(safetyId)
        safetyId = null
      }
      setIsComplete(true)
      window.setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 500)
    }

    safetyId = window.setTimeout(finish, 15_000)

    ;(async () => {
      try {
        const uid = user?.id
        if (!uid) {
          finish()
          return
        }

        let build = useAppStore.getState().currentBuild
        if (!build?.id) {
          const row = await fetchLatestPlayerBuildForUser(uid)
          if (row) setCurrentBuild(row)
          build = useAppStore.getState().currentBuild
        }

        if (!build?.id) {
          finish()
          return
        }

        await generateWorkoutPlan(uid, build, useAppStore.getState().onboardingData)
      } catch {
        /* generateWorkoutPlan should not throw; finish regardless */
      } finally {
        if (safetyId != null) {
          window.clearTimeout(safetyId)
          safetyId = null
        }
        finish()
      }
    })()

    return () => {
      if (safetyId != null) window.clearTimeout(safetyId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; read latest store inside async
  }, [])

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 pb-12 pt-14">
        <h1
          className="text-center font-display text-3xl font-bold uppercase tracking-tight"
          style={{ color: accent }}
        >
          BUILDING YOUR PLAN
        </h1>
        <p className="mt-3 text-center font-body text-sm text-[var(--text-secondary)]">
          {username} · {archetype} · {pathLabel(onboardingData.developmentPath)}
        </p>

        <div className="mt-10">
          <div className="generating-plan-progress h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div
              className={`generating-plan-progress__fill h-full rounded-full ${isComplete ? 'generating-plan-progress__fill--done' : ''}`}
              style={{
                background: accent,
                boxShadow: `0 0 16px ${accent}`,
              }}
            />
          </div>
          <p className="mt-2 text-center font-mono text-xs text-[var(--text-muted)]">
            {isComplete ? '100%' : 'Building…'}
          </p>
        </div>
      </div>
    </div>
  )
}
