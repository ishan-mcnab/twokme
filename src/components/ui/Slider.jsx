import { useCallback, useId, useState } from 'react'
import { motion } from 'framer-motion'

/**
 * 1–99 slider with neon styling. Uses native range for accessibility + drag.
 */
export function Slider({
  label,
  value,
  onChange,
  leftLabel = 'WEAK',
  rightLabel = 'ELITE',
  className = '',
}) {
  const id = useId()
  const [dragging, setDragging] = useState(false)
  const v = Math.min(99, Math.max(1, Number(value) || 1))
  const pct = (v - 1) / 98

  const onInput = useCallback(
    (e) => {
      onChange?.(Number(e.target.value))
    },
    [onChange],
  )

  return (
    <div className={`w-full ${className}`}>
      {label ? (
        <p className="mb-4 font-display text-sm font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
          {label}
        </p>
      ) : null}

      <div className="relative pt-10 pb-2">
        <div
          className="pointer-events-none absolute left-0 right-0 top-0"
          aria-hidden
        >
          <div
            className="absolute -translate-x-1/2 font-mono text-2xl font-semibold tabular-nums text-[var(--neon-blue)] [text-shadow:var(--glow-blue)] transition-[left] duration-150 ease-out"
            style={{ left: `${pct * 100}%` }}
          >
            {v}
          </div>
        </div>

        <div className="relative h-3 w-full rounded-full bg-[var(--bg-elevated)] ring-1 ring-[var(--border-subtle)]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--neon-blue)]/35"
            style={{ width: `${pct * 100}%` }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--neon-blue)] to-transparent opacity-90"
            style={{ width: `${Math.max(6, pct * 100)}%` }}
          />
          <input
            id={id}
            type="range"
            min={1}
            max={99}
            step={1}
            value={v}
            onChange={onInput}
            onPointerDown={() => setDragging(true)}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
            className="absolute inset-0 z-20 h-12 w-full cursor-pointer opacity-0"
            aria-valuemin={1}
            aria-valuemax={99}
            aria-valuenow={v}
            aria-label={label || 'Rating'}
          />
          <motion.div
            className="pointer-events-none absolute top-1/2 z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--bg-primary)] bg-[var(--neon-blue)] shadow-[var(--glow-blue)]"
            style={{ left: `${pct * 100}%` }}
            animate={{ scale: dragging ? 1.12 : 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </div>

        <div className="mt-3 flex justify-between font-display text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      </div>
    </div>
  )
}
