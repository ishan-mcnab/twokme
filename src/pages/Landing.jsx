import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const line = {
  hidden: { opacity: 0, y: 18 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
}

function MeshBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-1/3 -top-1/3 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(0, 212, 255, 0.35), transparent 60%)',
        }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-1/4 top-1/4 h-[460px] w-[460px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(123, 47, 255, 0.38), transparent 62%)',
        }}
        animate={{ x: [0, -36, 0], y: [0, 44, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-20%] left-[10%] h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 40% 40%, rgba(0, 255, 136, 0.12), transparent 65%)',
        }}
        animate={{ x: [0, 26, 0], y: [0, -28, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="court-lines absolute inset-0" />
      <div className="noise-overlay" />
    </div>
  )
}

function NeonDivider() {
  return (
    <motion.div
      className="neon-line my-10"
      initial={{ opacity: 0, scaleX: 0.2 }}
      whileInView={{ opacity: 0.75, scaleX: 1 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    />
  )
}

export function Landing() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <MeshBackground />

      <div className="relative z-10 mx-auto w-full max-w-[480px] px-5">
        <section className="flex min-h-dvh flex-col justify-center pb-10 pt-14">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-center"
          >
            <div className="font-display text-[clamp(2.6rem,10vw,3.75rem)] font-bold leading-[0.95] tracking-tight">
              <motion.div
                className="text-[var(--text-primary)] [text-shadow:0_0_40px_rgba(0,212,255,0.3)]"
                variants={line}
                initial="hidden"
                animate="show"
                custom={0}
              >
                YOUR GAME.
              </motion.div>
              <motion.div
                className="text-[var(--text-primary)] [text-shadow:0_0_40px_rgba(0,212,255,0.3)]"
                variants={line}
                initial="hidden"
                animate="show"
                custom={1}
              >
                YOUR BUILD.
              </motion.div>
              <motion.div
                className="text-[var(--neon-green)] [text-shadow:0_0_52px_rgba(0,255,136,0.55)]"
                variants={line}
                initial="hidden"
                animate="show"
                custom={2}
              >
                YOUR 2K.
              </motion.div>
            </div>

            <motion.p
              className="mx-auto mt-6 max-w-[38ch] text-balance font-body text-base leading-relaxed text-[var(--text-secondary)]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.45 }}
            >
              Turn your real-life basketball skills into a 2K-style archetype.
              Train daily. Level up for real.
            </motion.p>

            <motion.div
              className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.45 }}
            >
              <Link to="/signup" className="w-full sm:w-auto">
                <Button variant="primary" className="w-full">
                  Get Your Archetype
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="ghost" className="w-full">
                  Sign In
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        <NeonDivider />

        <section className="pb-16 pt-2">
          <motion.h2
            className="mb-6 text-center font-display text-xl font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            Built for hoopers
          </motion.h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05, duration: 0.45 }}
            >
              <Card glowing className="h-full p-4 text-left sm:p-5">
                <div className="text-2xl" aria-hidden>
                  🎮
                </div>
                <h3 className="mt-3 font-display text-lg font-bold uppercase tracking-wide text-[var(--text-primary)]">
                  Your Archetype
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  200+ archetypes from the full 2K roster, matched to your
                  actual game
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.45 }}
            >
              <Card glowing className="h-full p-4 text-left sm:p-5">
                <div className="text-2xl" aria-hidden>
                  📈
                </div>
                <h3 className="mt-3 font-display text-lg font-bold uppercase tracking-wide text-[var(--text-primary)]">
                  Real Workouts
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Daily AI-generated drills that target your exact weaknesses
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25, duration: 0.45 }}
            >
              <Card glowing className="h-full p-4 text-left sm:p-5">
                <div className="text-2xl" aria-hidden>
                  ⚡
                </div>
                <h3 className="mt-3 font-display text-lg font-bold uppercase tracking-wide text-[var(--text-primary)]">
                  Level Up
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  XP, streaks, and attribute growth that mirror your real court
                  progress
                </p>
              </Card>
            </motion.div>
          </div>
        </section>

        <NeonDivider />

        <footer className="pb-10 pt-2 text-center font-body text-sm text-[var(--text-muted)]">
          TwoKMe © 2025
        </footer>
      </div>
    </div>
  )
}
