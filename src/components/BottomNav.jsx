import { motion } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'

const TABS = [
  { to: '/dashboard', label: 'HOME', icon: '🏠' },
  { to: '/workout', label: 'WORKOUT', icon: '🏀' },
  { to: '/player-card', label: 'MY CARD', icon: '📋' },
  { to: '/profile', label: 'PROFILE', icon: '👤' },
]

function hideNav(pathname) {
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') return true
  if (pathname.startsWith('/onboarding')) return true
  if (pathname === '/evolution') return true
  if (pathname === '/auth/callback') return true
  return false
}

export function BottomNav() {
  const { pathname } = useLocation()
  if (hideNav(pathname)) return null

  return (
    <nav
      className="bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-subtle)] bg-[rgba(8,8,16,0.96)] backdrop-blur-md"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-[480px] items-stretch justify-around px-1 pt-1">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              [
                'flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 font-display text-[10px] font-bold uppercase tracking-wide transition-colors',
                isActive ? 'text-[var(--neon-blue)]' : 'text-[var(--text-muted)]',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <motion.span
                className="flex flex-col items-center gap-0.5"
                whileTap={{ scale: 0.94 }}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {tab.icon}
                </span>
                <span className={isActive ? 'text-[var(--neon-blue)]' : ''}>{tab.label}</span>
              </motion.span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
