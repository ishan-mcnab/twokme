import { supabase } from './supabase'
import { ATTRIBUTE_KEYS, computeOVR } from './attributeMapping'
import { syncAttributesToStore } from './profile'
import { calculateStreakMultiplier, getStreakStatus } from './streakSystem'
import { checkForEvolution } from './evolutionDetector'
import useAppStore from '../store/useAppStore'

const XP_BY_INTENSITY = {
  low: 15,
  medium: 25,
  high: 35,
  peak: 45,
  none: 0,
}

/**
 * Convert lifetime XP on one attribute to a 1–99 rating (deterministic).
 * @param {number} totalXp
 */
const VALUE_BANDS = [
  { to: 50, cost: 100 },
  { to: 70, cost: 200 },
  { to: 85, cost: 400 },
  { to: 99, cost: 800 },
]

export function calculateNewAttributeValue(totalXp) {
  let value = 25
  let xp = Math.max(0, Math.floor(Number(totalXp) || 0))
  for (const band of VALUE_BANDS) {
    while (value < band.to && xp >= band.cost) {
      value += 1
      xp -= band.cost
    }
  }
  return Math.min(99, Math.max(1, value))
}

/**
 * XP banked toward the next +1 rating (0–1) for UI sub-bars.
 * @param {number} totalXp
 */
export function getXpProgressToNextPoint(totalXp) {
  let value = 25
  let xp = Math.max(0, Math.floor(Number(totalXp) || 0))
  for (const band of VALUE_BANDS) {
    while (value < band.to && xp >= band.cost) {
      value += 1
      xp -= band.cost
    }
  }
  if (value >= 99) return 1
  let cost = 800
  for (const band of VALUE_BANDS) {
    if (value < band.to) {
      cost = band.cost
      break
    }
  }
  return Math.min(1, Math.max(0, xp / cost))
}

/**
 * Integer XP still needed for the next +1 rating (0 at 99).
 * @param {number} totalXp
 */
export function getXpRemainingToNextPoint(totalXp) {
  let value = 25
  let xp = Math.max(0, Math.floor(Number(totalXp) || 0))
  for (const band of VALUE_BANDS) {
    while (value < band.to && xp >= band.cost) {
      value += 1
      xp -= band.cost
    }
  }
  if (value >= 99) return 0
  let cost = 800
  for (const band of VALUE_BANDS) {
    if (value < band.to) {
      cost = band.cost
      break
    }
  }
  return Math.max(0, cost - xp)
}

/** Minimum total_xp such that calculateNewAttributeValue(tp) >= targetRating */
export function seedTotalXpForRating(targetRating) {
  const t = Math.min(99, Math.max(1, Math.round(Number(targetRating) || 50)))
  let lo = 0
  let hi = 200000
  let best = hi
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    const v = calculateNewAttributeValue(mid)
    if (v >= t) {
      best = mid
      hi = mid - 1
    } else {
      lo = mid + 1
    }
  }
  return best
}

function aggregateXpFromDrills(drills, focusAttributes, intensityKey) {
  /** @type {Record<string, number>} */
  const out = {}
  const base = XP_BY_INTENSITY[intensityKey] ?? XP_BY_INTENSITY.medium
  const focus = Array.isArray(focusAttributes) ? focusAttributes.filter(Boolean) : []

  if (Array.isArray(drills) && drills.length) {
    for (const d of drills) {
      const k = d?.attributeTarget
      if (!k || typeof k !== 'string') continue
      const xp = Math.max(8, Math.min(50, Math.round(Number(d.xp) || 15)))
      out[k] = (out[k] || 0) + xp
    }
  }

  for (const k of focus) {
    if (out[k] == null) {
      out[k] = Math.max(10, Math.round(base / Math.max(1, focus.length)))
    }
  }
  return out
}

/**
 * @param {string} userId
 * @param {string} buildId
 * @param {Record<string, unknown>} workout
 * @param {Record<string, unknown>} planRow
 * @param {Array<{ attributeTarget?: string, xp?: number }>} drills
 * @param {'workout'|'active_recovery'} workoutKind
 */
export async function logWorkoutAndDistributeXP(
  userId,
  buildId,
  workout,
  planRow,
  drills,
  workoutKind = 'workout',
) {
  if (!supabase) {
    return {
      attributes: {},
      streakDay: 0,
      xpEarned: {},
      streakBroken: false,
      planRow,
      skipped: false,
    }
  }

  const planDayForGate = Number(planRow?.current_day) || 1
  const streakInfo = await getStreakStatus(userId, buildId, planDayForGate)
  if (streakInfo.alreadyLoggedToday) {
    const { data: buildRow, error: buildErr } = await supabase
      .from('player_builds')
      .select('attributes')
      .eq('id', buildId)
      .single()
    if (buildErr) throw buildErr
    const attrs =
      typeof buildRow?.attributes === 'object' && buildRow.attributes !== null
        ? buildRow.attributes
        : {}
    return {
      attributes: attrs,
      streakDay: streakInfo.currentStreak,
      xpEarned: {},
      streakBroken: streakInfo.streakBroken,
      planRow,
      skipped: true,
    }
  }
  const intensityKey = String(workout?.intensity || 'medium').toLowerCase()

  let mult = calculateStreakMultiplier(streakInfo.currentStreak)
  const streakBroken = streakInfo.streakBroken
  if (streakBroken) mult *= 0.8

  const focus =
    workoutKind === 'active_recovery'
      ? []
      : Array.isArray(workout?.focusAttributes)
        ? workout.focusAttributes
        : []

  let xpEarned =
    workoutKind === 'active_recovery'
      ? { stamina: 15, durability: 10 }
      : aggregateXpFromDrills(drills, focus, intensityKey)

  for (const k of Object.keys(xpEarned)) {
    const v = Math.round((xpEarned[k] || 0) * mult)
    xpEarned[k] = Math.max(10, v)
  }

  const newStreakDay = streakInfo.currentStreak + 1

  const dayNumber = Number(workout?.dayNumber) || 1

  const { error: logErr } = await supabase.from('workout_logs').insert({
    user_id: userId,
    build_id: buildId,
    day_number: dayNumber,
    xp_earned: xpEarned,
    streak_day: newStreakDay,
  })
  if (logErr) throw logErr

  const { data: progressRows, error: progErr } = await supabase
    .from('attribute_progress')
    .select('attribute_key, total_xp, current_value')
    .eq('user_id', userId)
    .eq('build_id', buildId)
  if (progErr) throw progErr

  const byKey = Object.fromEntries((progressRows || []).map((r) => [r.attribute_key, r]))

  const updates = ATTRIBUTE_KEYS.map((key) => {
    const row = byKey[key]
    let prevTotal = Number(row?.total_xp) || 0
    const curVal = Number(row?.current_value) || 50
    if (prevTotal === 0) prevTotal = seedTotalXpForRating(curVal)
    const add = xpEarned[key] || 0
    const newTotal = prevTotal + add
    const newVal = calculateNewAttributeValue(newTotal)
    return supabase
      .from('attribute_progress')
      .update({
        total_xp: newTotal,
        current_value: newVal,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('build_id', buildId)
      .eq('attribute_key', key)
      .then(({ error }) => {
        if (error) throw error
        return [key, newVal]
      })
  })

  const pairs = await Promise.all(updates)
  const mergedAttributes = Object.fromEntries(pairs)

  const { data: buildRow, error: buildErr } = await supabase
    .from('player_builds')
    .select('attributes')
    .eq('id', buildId)
    .single()
  if (buildErr) throw buildErr

  const prevAttrs =
    typeof buildRow?.attributes === 'object' && buildRow.attributes !== null
      ? buildRow.attributes
      : {}
  let mergedBuildAttrs = { ...prevAttrs, ...mergedAttributes }

  const setCb = useAppStore.getState().setCurrentBuild
  const syncRes = await syncAttributesToStore(
    userId,
    buildId,
    setCb,
    useAppStore.getState().currentBuild,
  )
  if (syncRes?.attributes) mergedBuildAttrs = syncRes.attributes

  const currentPlanDay = Number(planRow?.current_day) || 1
  const { data: updatedPlan, error: planErr } = await supabase
    .from('workout_plans')
    .update({ current_day: currentPlanDay + 1 })
    .eq('id', planRow.id)
    .select()
    .single()
  if (planErr) throw planErr

  const { error: buildUpErr } = await supabase
    .from('player_builds')
    .update({
      attributes: mergedBuildAttrs,
      updated_at: new Date().toISOString(),
    })
    .eq('id', buildId)
  if (buildUpErr) throw buildUpErr

  const { data: buildMeta } = await supabase
    .from('player_builds')
    .select('archetype')
    .eq('id', buildId)
    .single()

  const { data: profRow } = await supabase
    .from('profiles')
    .select('position')
    .eq('id', userId)
    .maybeSingle()

  const pos = String(profRow?.position || 'SF').toUpperCase()
  const evo = checkForEvolution(
    { archetype: buildMeta?.archetype },
    /** @type {Record<string, number>} */ (mergedBuildAttrs),
    pos,
  )
  if (evo) {
    const oldOvr = computeOVR(
      /** @type {Record<string, number>} */ (prevAttrs),
      pos,
    )
    const newOvr = computeOVR(
      /** @type {Record<string, number>} */ (mergedBuildAttrs),
      pos,
    )
    useAppStore.getState().setEvolutionPending(true, {
      newArchetype: evo.newArchetype,
      oldArchetype: evo.oldArchetype,
      scoreDiff: evo.scoreDiff,
      newScore: evo.newScore,
      oldOvr,
      newOvr,
      prevAttributes: { ...prevAttrs },
    })
  }

  return {
    attributes: mergedBuildAttrs,
    streakDay: newStreakDay,
    xpEarned,
    streakBroken,
    planRow: updatedPlan,
    skipped: false,
  }
}
