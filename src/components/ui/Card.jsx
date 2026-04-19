import { motion } from 'framer-motion'

export function Card({ glowing = false, className = '', children, ...props }) {
  return (
    <motion.div
      initial={false}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className={[
        'rounded-2xl bg-[var(--bg-card)] border',
        glowing
          ? 'border-[var(--neon-blue)] shadow-[var(--glow-blue)]'
          : 'border-[var(--border-subtle)]',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </motion.div>
  )
}
