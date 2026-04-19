import { motion } from 'framer-motion'

const base =
  'inline-flex items-center justify-center gap-2 px-6 py-3 font-display font-bold uppercase tracking-[0.12em] rounded-[50px] border border-transparent transition-[background-color,box-shadow,border-color,color,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] disabled:pointer-events-none disabled:opacity-45'

const variants = {
  primary:
    'bg-[var(--neon-blue)] text-[var(--bg-primary)] shadow-[var(--glow-blue)] hover:shadow-[0_0_28px_rgba(0,212,255,0.55)] hover:brightness-110',
  secondary:
    'bg-transparent text-[var(--neon-blue)] border-[var(--neon-blue)] hover:bg-[rgba(0,212,255,0.12)] hover:shadow-[0_0_20px_rgba(0,212,255,0.25)]',
  ghost:
    'bg-transparent text-[var(--text-primary)] border-transparent hover:opacity-80',
  danger:
    'bg-[#ff3b5c] text-white shadow-[0_0_20px_rgba(255,59,92,0.35)] hover:brightness-110',
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      className={`${base} ${variants[variant] ?? variants.primary} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
