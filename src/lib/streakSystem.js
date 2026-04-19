import { supabase } from './supabase'

export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 100]

/** @returns {string} YYYY-MM-DD in UTC */
export function utcDateString(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

/**
 * @param {number} currentStreak
 * @returns {number} multiplier applied to base XP
 */
export function calculateStreakMultiplier(currentStreak) {
  const s = Math.max(0, Number(currentStreak) || 0)
  if (s >= 30) return 1.5
  if (s >= 14) return 1.3
  if (s >= 7) return 1.2
  if (s >= 3) return 1.1
  return 1.0
}

/**
 * @param {string} userId
 * @param {string|null|undefined} buildId
 * @param {number|null|undefined} planCurrentDay — `workout_plans.current_day` (plan index for the active session)
 * @param {{ planLastLoggedDate?: string|null }} [opts]
 * @returns {Promise<{ currentStreak: number, lastLogDate: string|null, alreadyLoggedToday: boolean, streakBroken: boolean, loggedCalendarToday: boolean }>}
 *
 * `alreadyLoggedToday` is true when `workout_plans.last_logged_date` is today (UTC), or (legacy) a `workout_logs`
 * row exists for this user+build with `day_number === planCurrentDay` while `last_logged_date` is not set yet.
 *
 * Streak fields use UTC calendar dates on `completed_at` only.
 */
export async function getStreakStatus(userId, buildId, planCurrentDay, opts = {}) {
  if (!supabase || !userId) {
    return {
      currentStreak: 0,
      lastLogDate: null,
      alreadyLoggedToday: false,
      streakBroken: false,
      loggedCalendarToday: false,
    }
  }

  const planDay = Math.max(1, Math.round(Number(planCurrentDay) || 1))
  const today = utcDateString()
  const planLast = opts.planLastLoggedDate
  let alreadyLoggedToday = false

  if (typeof planLast === 'string' && planLast === today) {
    alreadyLoggedToday = true
  } else if (buildId && (planLast == null || planLast === '')) {
    const { data: dayLog, error: dayErr } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('build_id', buildId)
      .eq('day_number', planDay)
      .limit(1)

    if (!dayErr && Array.isArray(dayLog) && dayLog.length > 0) {
      alreadyLoggedToday = true
    }
  }

  const { data, error } = await supabase
    .from('workout_logs')
    .select('completed_at')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(200)

  if (error || !data?.length) {
    return {
      currentStreak: 0,
      lastLogDate: null,
      alreadyLoggedToday,
      streakBroken: false,
      loggedCalendarToday: false,
    }
  }

  const datesWithLog = new Set(data.map((r) => utcDateString(new Date(r.completed_at))))
  const loggedCalendarToday = datesWithLog.has(today)

  const last = data[0]
  const lastLogDate = utcDateString(new Date(last.completed_at))

  /** Days between two YYYY-MM-DD strings (a - b) in calendar days */
  function daysBetween(a, b) {
    const [ay, am, ad] = a.split('-').map(Number)
    const [by, bm, bd] = b.split('-').map(Number)
    const da = Date.UTC(ay, am - 1, ad)
    const db = Date.UTC(by, bm - 1, bd)
    return Math.round((da - db) / 86400000)
  }

  let streakBroken = false
  if (!loggedCalendarToday && lastLogDate !== today) {
    const gap = daysBetween(today, lastLogDate)
    if (gap >= 2) streakBroken = true
  }

  let cursor = new Date()
  if (!loggedCalendarToday) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  let currentStreak = 0
  for (let i = 0; i < 400; i++) {
    const ds = utcDateString(cursor)
    if (!datesWithLog.has(ds)) break
    currentStreak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return {
    currentStreak,
    lastLogDate,
    alreadyLoggedToday,
    streakBroken,
    loggedCalendarToday,
  }
}

export function isStreakMilestone(streakAfterLog) {
  const n = Number(streakAfterLog) || 0
  return STREAK_MILESTONES.includes(n)
}
