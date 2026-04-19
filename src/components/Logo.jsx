export function Logo({ className = '' }) {
  return (
    <div
      className={`font-display text-3xl font-bold tracking-tight text-[var(--text-primary)] ${className}`}
    >
      Two<span className="text-[var(--neon-blue)]">K</span>Me
    </div>
  )
}
