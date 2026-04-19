const palette = {
  blue: {
    bg: 'rgba(0, 212, 255, 0.12)',
    border: 'rgba(0, 212, 255, 0.45)',
    text: 'var(--neon-blue)',
  },
  green: {
    bg: 'rgba(0, 255, 136, 0.12)',
    border: 'rgba(0, 255, 136, 0.45)',
    text: 'var(--neon-green)',
  },
  gold: {
    bg: 'rgba(255, 215, 0, 0.12)',
    border: 'rgba(255, 215, 0, 0.45)',
    text: 'var(--neon-gold)',
  },
  purple: {
    bg: 'rgba(123, 47, 255, 0.12)',
    border: 'rgba(123, 47, 255, 0.45)',
    text: 'var(--neon-purple)',
  },
}

export function Badge({ variant = 'blue', className = '', children, ...props }) {
  const c = palette[variant] ?? palette.blue
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        className,
      ].join(' ')}
      style={{
        backgroundColor: c.bg,
        borderColor: c.border,
        color: c.text,
      }}
      {...props}
    >
      {children}
    </span>
  )
}
