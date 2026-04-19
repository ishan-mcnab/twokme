import { useMemo } from 'react'
import { motion } from 'framer-motion'

const AXES = [
  { key: 'inside', label: 'INSIDE' },
  { key: 'outside', label: 'OUTSIDE' },
  { key: 'playmaking', label: 'PLAY' },
  { key: 'defense', label: 'DEF' },
  { key: 'athleticism', label: 'ATH' },
  { key: 'intangibles', label: 'INT' },
]

function polar(cx, cy, r, angleRad) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  }
}

/**
 * @param {object} props
 * @param {{ inside: number, outside: number, playmaking: number, defense: number, athleticism: number, intangibles: number }} props.values 0–100
 * @param {string} [props.className]
 */
export function RadarChart({ values, className = '' }) {
  const cx = 100
  const cy = 100
  const R = 72
  const n = 6

  const poly = useMemo(() => {
    let d = ''
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const v = Math.min(100, Math.max(0, Number(values[AXES[i].key]) || 0)) / 100
      const p = polar(cx, cy, R * v, angle)
      d += (i === 0 ? 'M' : 'L') + `${p.x.toFixed(2)},${p.y.toFixed(2)}`
    }
    d += 'Z'
    return d
  }, [values])

  const gridRings = [0.25, 0.5, 0.75, 1]
  const spokes = Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const outer = polar(cx, cy, R, angle)
    return { x1: cx, y1: cy, x2: outer.x, y2: outer.y, angle, label: AXES[i].label }
  })

  return (
    <svg
      viewBox="0 0 200 200"
      className={`mx-auto w-full max-w-[220px] overflow-visible ${className}`}
      aria-hidden
    >
      {gridRings.map((t) => (
        <polygon
          key={t}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth="1"
          points={Array.from({ length: n }, (_, i) => {
            const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
            const p = polar(cx, cy, R * t, a)
            return `${p.x},${p.y}`
          }).join(' ')}
        />
      ))}
      {spokes.map((s) => (
        <line
          key={s.x2}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke="var(--border-subtle)"
          strokeWidth="1"
        />
      ))}
      <motion.path
        d={poly}
        fill="rgba(0, 212, 255, 0.2)"
        stroke="var(--neon-blue)"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ pathLength: { duration: 0.9, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.35 } }}
      />
      {spokes.map((s) => {
        const lp = polar(cx, cy, R + 14, s.angle)
        return (
          <text
            key={s.label}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[var(--text-muted)] font-display text-[9px] font-bold tracking-wider"
          >
            {s.label}
          </text>
        )
      })}
    </svg>
  )
}
