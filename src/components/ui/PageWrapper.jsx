import { motion } from 'framer-motion'

export function PageWrapper({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`mx-auto w-full max-w-[480px] px-5 py-8 ${className}`}
    >
      {children}
    </motion.div>
  )
}
