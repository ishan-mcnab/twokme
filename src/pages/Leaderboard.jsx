import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchFriendsLeaderboard,
  fetchGlobalLeaderboard,
  formatSeasonLabel,
  getCurrentSeason,
  getDaysUntilMonthReset,
  getPendingRequests,
  searchUsers,
  sendFriendRequest,
} from '../lib/leaderboard'

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="workout-skeleton h-16 w-full rounded-xl" />
      ))}
    </div>
  )
}

function rankStyle(rank) {
  if (rank === 1) {
    return 'border-2 border-[var(--neon-gold)] shadow-[var(--glow-gold)] scale-[1.02]'
  }
  if (rank === 2) {
    return 'border-2 border-[#c0c0c0]'
  }
  if (rank === 3) {
    return 'border-2 border-[#cd7f32]'
  }
  return 'border border-[var(--border-subtle)]'
}

export function Leaderboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('global')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [myRow, setMyRow] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [pending, setPending] = useState([])
  const [acceptedFriendCount, setAcceptedFriendCount] = useState(null)

  const { year, month } = useMemo(() => getCurrentSeason(), [])
  const seasonLabel = useMemo(() => formatSeasonLabel(year, month), [year, month])
  const daysLeft = useMemo(() => getDaysUntilMonthReset(), [])

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(searchInput.trim()), 300)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const loadPending = useCallback(async () => {
    if (!user?.id) return
    const p = await getPendingRequests(user.id)
    setPending(p)
  }, [user])

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list =
        tab === 'global' ? await fetchGlobalLeaderboard(50) : await fetchFriendsLeaderboard(user.id, 50)
      setRows(list)

      const { data: mine } = await supabase
        .from('leaderboard_scores')
        .select('*')
        .eq('user_id', user.id)
        .eq('season_year', year)
        .eq('season_month', month)
        .maybeSingle()

      setMyRow(mine || null)

      let rank = null
      if (mine) {
        const idx = list.findIndex((r) => r.user_id === user.id)
        if (idx >= 0) {
          rank = idx + 1
        } else if (tab === 'global' && mine.score != null) {
          const { count, error } = await supabase
            .from('leaderboard_scores')
            .select('id', { count: 'exact', head: true })
            .eq('season_year', year)
            .eq('season_month', month)
            .gt('score', mine.score)
          if (!error) rank = (count ?? 0) + 1
        }
      }
      setMyRank(rank)

      if (tab === 'friends') {
        await loadPending()
        const { count } = await supabase
          .from('friendships')
          .select('id', { count: 'exact', head: true })
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'accepted')
        setAcceptedFriendCount(count ?? 0)
      } else {
        setAcceptedFriendCount(null)
      }
    } finally {
      setLoading(false)
    }
  }, [user, tab, year, month, loadPending])

  useEffect(() => {
    // Defer to avoid cascading render lint (load sets loading state immediately).
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [load])

  useEffect(() => {
    let cancel = false
    async function runSearch() {
      if (!user?.id || searchDebounced.length < 2) {
        setSearchResults([])
        return
      }
      setSearchLoading(true)
      const res = await searchUsers(searchDebounced, user.id)
      if (!cancel) {
        setSearchResults(res)
        setSearchLoading(false)
      }
    }
    void runSearch()
    return () => {
      cancel = true
    }
  }, [searchDebounced, user])

  const displayRows = useMemo(() => {
    if (!user?.id) return rows
    return rows.filter((r) => r.user_id !== user.id)
  }, [rows, user])

  /** Ranks from full `rows` order (1-based). */
  const rankByUserId = useMemo(() => {
    const m = new Map()
    rows.forEach((r, i) => m.set(r.user_id, i + 1))
    return m
  }, [rows])

  const handleAddFriend = async (friendId) => {
    if (!user?.id) return
    const ok = await sendFriendRequest(user.id, friendId)
    if (ok) {
      setSearchResults((prev) => prev.filter((p) => p.id !== friendId))
    }
  }

  const handleAccept = async (id) => {
    const ok = await acceptFriendRequest(id)
    if (ok) await loadPending()
  }

  const handleDecline = async (id) => {
    const ok = await declineFriendRequest(id)
    if (ok) await loadPending()
  }

  const top10You = myRank != null && myRank <= 10

  return (
    <div className="min-h-dvh bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[rgba(8,8,16,0.92)] backdrop-blur-md">
        <div className="mx-auto max-w-[480px] px-4 py-5">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-white">LEADERBOARD</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-wider text-[var(--text-muted)]">{seasonLabel}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            Resets in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[480px] px-4 pt-4">
        <div className="flex border-b border-[var(--border-subtle)]">
          {[
            { id: 'global', label: 'GLOBAL' },
            { id: 'friends', label: 'FRIENDS' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                'relative flex-1 pb-3 font-display text-xs font-bold uppercase tracking-wider',
                tab === t.id ? 'text-[var(--neon-blue)]' : 'text-[var(--text-muted)]',
              ].join(' ')}
            >
              {t.label}
              {tab === t.id ? (
                <motion.span
                  layoutId="lbTab"
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--neon-blue)]"
                />
              ) : null}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: tab === 'global' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tab === 'global' ? 12 : -12 }}
            transition={{ duration: 0.22 }}
            className="mt-6 space-y-4"
          >
            {loading ? (
              <SkeletonRows />
            ) : (
              <>
                {user?.id ? (
                  <div
                    className={[
                      'relative rounded-2xl bg-[var(--bg-card)] p-4',
                      top10You
                        ? 'border-2 border-[var(--neon-gold)] shadow-[var(--glow-gold)]'
                        : 'border-2 border-[var(--neon-blue)]/60',
                    ].join(' ')}
                  >
                    <span className="absolute right-3 top-3 rounded-full bg-[rgba(0,212,255,0.15)] px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-[var(--neon-blue)]">
                      YOU
                    </span>
                    <p className="font-mono text-[10px] uppercase text-[var(--text-muted)]">
                      {myRank != null ? `#${myRank}` : myRow ? 'UNRANKED' : 'NO SCORE YET'}
                    </p>
                    <p className="mt-1 font-display text-xl font-bold text-white">
                      {myRow?.username || 'You'}
                    </p>
                    <p className="mt-0.5 font-body text-xs text-[var(--text-secondary)]">{myRow?.archetype || '—'}</p>
                    <p className="mt-2 text-right font-mono text-lg font-bold text-[var(--neon-blue)]">
                      {myRow?.score != null ? Number(myRow.score).toLocaleString() : '—'}
                    </p>
                  </div>
                ) : null}

                {tab === 'friends' &&
                acceptedFriendCount !== null &&
                acceptedFriendCount === 0 &&
                !loading ? (
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-center">
                    <p className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      NO FRIENDS YET
                    </p>
                    <p className="mt-2 font-body text-xs text-[var(--text-secondary)]">ADD FRIENDS TO COMPETE</p>
                    <ButtonGhostFind onClick={() => setSearchOpen(true)} />
                  </div>
                ) : null}

                {tab === 'friends' && pending.length ? (
                  <div className="space-y-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Pending requests
                    </p>
                    {pending.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2"
                      >
                        <div>
                          <p className="font-display text-sm font-bold text-white">{p.username}</p>
                          <p className="font-mono text-[10px] text-[var(--text-secondary)]">
                            {p.position || '—'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-[var(--neon-green)] px-3 py-1 font-mono text-[10px] font-bold uppercase text-[var(--neon-green)]"
                            onClick={() => void handleAccept(p.id)}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-[var(--border-subtle)] px-3 py-1 font-mono text-[10px] font-bold uppercase text-[var(--text-muted)]"
                            onClick={() => void handleDecline(p.id)}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {tab === 'friends' && acceptedFriendCount > 0 ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSearchOpen(true)}
                      className="font-display text-xs font-bold uppercase tracking-wide text-[var(--neon-blue)] underline-offset-4 hover:underline"
                    >
                      FIND PLAYERS →
                    </button>
                  </div>
                ) : null}

                <div className="space-y-2">
                  {!loading &&
                  !(tab === 'friends' && acceptedFriendCount !== null && acceptedFriendCount === 0) &&
                  displayRows.length === 0 ? (
                    <p className="py-4 text-center font-body text-sm text-[var(--text-secondary)]">
                      {tab === 'friends'
                        ? 'No friend scores this season yet.'
                        : 'No scores this season yet.'}
                    </p>
                  ) : null}
                  {!loading &&
                    !(tab === 'friends' && acceptedFriendCount !== null && acceptedFriendCount === 0) &&
                    displayRows.map((r) => {
                      const rank = rankByUserId.get(r.user_id) ?? 0
                      const top3 = rank <= 3 && rank >= 1
                      return (
                        <div
                          key={r.id}
                          className={[
                            'flex items-center gap-3 rounded-xl bg-[var(--bg-card)] px-3 py-3',
                            top3 ? rankStyle(rank) : 'border border-[var(--border-subtle)]',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'w-10 shrink-0 font-mono text-sm font-bold',
                              rank <= 3 ? 'text-[var(--neon-gold)]' : 'text-[var(--text-muted)]',
                            ].join(' ')}
                          >
                            #{rank}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-base font-bold text-white">
                              {rank === 1 ? '👑 ' : ''}
                              {r.username || 'Player'}
                            </p>
                            <p className="truncate font-body text-[11px] text-[var(--text-secondary)]">
                              {r.archetype || '—'}
                            </p>
                            {Number(r.current_streak) > 0 ? (
                              <p className="mt-0.5 font-mono text-[10px] text-[var(--neon-gold)]">
                                🔥 {r.current_streak} streak
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 font-mono text-sm font-bold text-[var(--neon-blue)]">
                            {Number(r.score).toLocaleString()}
                          </span>
                        </div>
                      )
                    })}
                </div>

                {tab === 'global' && !rows.length && !loading ? (
                  <p className="py-8 text-center font-body text-sm text-[var(--text-secondary)]">
                    No scores this season yet. Log a workout to appear on the board.
                  </p>
                ) : null}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {searchOpen ? (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="max-h-[85dvh] w-full max-w-[480px] overflow-hidden rounded-t-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-[var(--border-subtle)] px-4 py-3">
                <p className="font-display text-sm font-bold uppercase text-white">Find players</p>
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search username…"
                  className="mt-3 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 font-body text-sm text-[var(--text-primary)] outline-none ring-[var(--neon-blue)] focus:ring-2"
                />
              </div>
              <div className="max-h-[55dvh] space-y-2 overflow-y-auto p-4">
                {searchLoading ? (
                  <p className="text-center font-mono text-xs text-[var(--text-muted)]">Searching…</p>
                ) : searchResults.length ? (
                  searchResults.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-bold text-white">{p.username}</p>
                        <p className="font-mono text-[10px] text-[var(--text-secondary)]">{p.position || '—'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleAddFriend(p.id)}
                        className="shrink-0 rounded-lg border border-[var(--neon-blue)] px-3 py-1 font-mono text-[10px] font-bold uppercase text-[var(--neon-blue)]"
                      >
                        ADD
                      </button>
                    </div>
                  ))
                ) : searchDebounced.length >= 2 ? (
                  <p className="text-center font-body text-sm text-[var(--text-secondary)]">No matches</p>
                ) : (
                  <p className="text-center font-mono text-xs text-[var(--text-muted)]">Type at least 2 characters</p>
                )}
              </div>
              <div className="border-t border-[var(--border-subtle)] p-3">
                <button
                  type="button"
                  className="w-full rounded-xl py-3 font-display text-xs font-bold uppercase text-[var(--text-muted)]"
                  onClick={() => setSearchOpen(false)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function ButtonGhostFind({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 w-full rounded-xl border border-[var(--neon-blue)]/40 bg-transparent py-3 font-display text-xs font-bold uppercase tracking-wide text-[var(--neon-blue)]"
    >
      FIND PLAYERS →
    </button>
  )
}
