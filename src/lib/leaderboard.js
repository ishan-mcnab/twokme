import { supabase } from './supabase'
import { getStreakStatus } from './streakSystem'

export function computeLeaderboardScore(totalXp, longestStreak, currentStreak) {
  const streakBonus = Math.max(1, Math.log10(longestStreak + 1) * 1.5)
  const currentStreakBonus = currentStreak > 0 ? currentStreak * 50 : 0
  return Math.round(totalXp * streakBonus + currentStreakBonus)
}

export function getCurrentSeason() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

const MONTHS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
]

export function formatSeasonLabel(year, month) {
  const m = Math.min(12, Math.max(1, Math.round(Number(month) || 1)))
  const y = Math.round(Number(year) || new Date().getFullYear())
  return `SEASON — ${MONTHS[m - 1]} ${y}`
}

/** Calendar days until UTC month rollover (exclusive of last day of month). */
export function getDaysUntilMonthReset() {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const diffMs = next.getTime() - today
  return Math.max(0, Math.ceil(diffMs / 86400000))
}

/**
 * Aggregate XP and streak stats from workout logs for one build.
 * @param {string} userId
 * @param {string} buildId
 */
export async function aggregateWorkoutLogStats(userId, buildId) {
  if (!supabase || !userId || !buildId) {
    return { totalXp: 0, workoutsLogged: 0, maxStreakDay: 0 }
  }
  const { data: logs, error } = await supabase
    .from('workout_logs')
    .select('xp_earned, streak_day')
    .eq('user_id', userId)
    .eq('build_id', buildId)
  if (error || !logs?.length) {
    return { totalXp: 0, workoutsLogged: 0, maxStreakDay: 0 }
  }
  let totalXp = 0
  let maxStreakDay = 0
  for (const row of logs) {
    const obj = row.xp_earned && typeof row.xp_earned === 'object' ? row.xp_earned : {}
    for (const v of Object.values(obj)) {
      totalXp += Number(v) || 0
    }
    maxStreakDay = Math.max(maxStreakDay, Number(row.streak_day) || 0)
  }
  return { totalXp, workoutsLogged: logs.length, maxStreakDay }
}

/**
 * Recompute and upsert leaderboard row for the active season (call after any log).
 * @param {string} userId
 * @param {string} buildId
 * @param {number} planCurrentDay — `workout_plans.current_day` for streak gating
 */
export async function refreshLeaderboardForUser(userId, buildId, planCurrentDay) {
  if (!supabase || !userId || !buildId) return

  const planDay = Math.max(1, Math.round(Number(planCurrentDay) || 1))
  const [{ data: prof }, { data: build }, streak, agg] = await Promise.all([
    supabase.from('profiles').select('username, position').eq('id', userId).maybeSingle(),
    supabase.from('player_builds').select('archetype').eq('id', buildId).maybeSingle(),
    getStreakStatus(userId, buildId, planDay),
    aggregateWorkoutLogStats(userId, buildId),
  ])

  const { year, month } = getCurrentSeason()
  const longestStreak = Math.max(agg.maxStreakDay, streak.currentStreak)
  const score = computeLeaderboardScore(agg.totalXp, longestStreak, streak.currentStreak)

  const { error } = await supabase.from('leaderboard_scores').upsert(
    {
      user_id: userId,
      username: prof?.username?.trim() || 'Anonymous',
      archetype: build?.archetype || 'Prospect',
      position: String(prof?.position || 'SF').toUpperCase(),
      season_year: year,
      season_month: month,
      total_xp: agg.totalXp,
      longest_streak: longestStreak,
      current_streak: streak.currentStreak,
      workouts_logged: agg.workoutsLogged,
      score,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,season_year,season_month' },
  )

  if (error) console.error('Leaderboard update failed:', error)
}

export async function fetchGlobalLeaderboard(limit = 50) {
  if (!supabase) return []
  const { year, month } = getCurrentSeason()
  const { data, error } = await supabase
    .from('leaderboard_scores')
    .select('*')
    .eq('season_year', year)
    .eq('season_month', month)
    .order('score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('fetchGlobalLeaderboard', error)
    return []
  }
  return data || []
}

export async function fetchFriendsLeaderboard(userId, limit = 50) {
  if (!supabase || !userId) return []
  const { year, month } = getCurrentSeason()

  const { data: friendships, error: fErr } = await supabase
    .from('friendships')
    .select('friend_id, user_id')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted')

  if (fErr) return []

  const friendIds =
    friendships?.map((f) => (f.user_id === userId ? f.friend_id : f.user_id)) ?? []
  const allIds = [...new Set([...friendIds, userId])]

  const { data, error } = await supabase
    .from('leaderboard_scores')
    .select('*')
    .eq('season_year', year)
    .eq('season_month', month)
    .in('user_id', allIds)
    .order('score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('fetchFriendsLeaderboard', error)
    return []
  }
  return data || []
}

export async function sendFriendRequest(userId, friendId) {
  if (!supabase || !userId || !friendId || userId === friendId) return false
  const { error } = await supabase
    .from('friendships')
    .insert({ user_id: userId, friend_id: friendId, status: 'pending' })
  return !error
}

export async function acceptFriendRequest(friendshipId) {
  if (!supabase) return false
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
  return !error
}

export async function declineFriendRequest(friendshipId) {
  if (!supabase) return false
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
  return !error
}

function sanitizeSearchQuery(q) {
  return String(q || '')
    .trim()
    .slice(0, 32)
    .replace(/%/g, '')
    .replace(/_/g, '')
}

export async function searchUsers(query, currentUserId) {
  if (!supabase || !currentUserId) return []
  const q = sanitizeSearchQuery(query)
  if (q.length < 2) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, position')
    .ilike('username', `%${q}%`)
    .neq('id', currentUserId)
    .limit(10)

  if (error) {
    console.error('searchUsers', error)
    return []
  }
  return data || []
}

/**
 * Incoming pending requests (others added you).
 * @returns {Promise<{ id: string, user_id: string, username: string, position: string|null }[]>}
 */
export async function getPendingRequests(userId) {
  if (!supabase || !userId) return []
  const { data: rows, error } = await supabase
    .from('friendships')
    .select('id, user_id')
    .eq('friend_id', userId)
    .eq('status', 'pending')

  if (error || !rows?.length) return []

  const ids = [...new Set(rows.map((r) => r.user_id))]
  const { data: profs, error: pErr } = await supabase
    .from('profiles')
    .select('id, username, position')
    .in('id', ids)

  if (pErr) return []
  const byId = Object.fromEntries((profs || []).map((p) => [p.id, p]))
  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    username: byId[r.user_id]?.username || 'Player',
    position: byId[r.user_id]?.position ?? null,
  }))
}
