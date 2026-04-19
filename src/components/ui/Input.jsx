import { forwardRef } from 'react'

export const Input = forwardRef(function Input(
  { className = '', type = 'text', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={[
        'w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 font-body text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-[border-color,box-shadow] duration-200',
        'focus:border-[var(--neon-blue)] focus:shadow-[0_0_0_1px_var(--border-glow),var(--glow-blue)] focus:outline-none',
        className,
      ].join(' ')}
      {...props}
    />
  )
})
