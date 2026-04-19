import { supabase } from './supabase'
import { ATTRIBUTE_KEYS } from './attributeMapping'
import { utcDateString } from './streakSystem'
import useAppStore from '../store/useAppStore'

/** Phase 5 — XP per drill tier (not used in plan skeleton). */
export const XP_PER_DRILL = {
  low: 15,
  medium: 25,
  high: 40,
}

export const PATH_FOCUS = {
  offensive: `
    Focus 70% of workouts on offensive skills: finishing, shooting, ball handling, shot creation.
    30% on athleticism and maintaining defensive fundamentals.
    Prioritize the player's weakest offensive attributes first.
    Include at least 2 shooting workouts and 1 finishing workout per week.
  `,
  defensive: `
    Focus 70% of workouts on defensive skills: perimeter defense, interior defense, rebounding, steals, help defense IQ.
    30% on athleticism and maintaining offensive fundamentals.
    Prioritize the player's weakest defensive attributes first.
    Include at least 2 defensive footwork workouts and 1 rebounding workout per week.
  `,
  balanced: `
    Spread workouts evenly across all skill areas.
    Identify the player's 6 weakest attributes overall and rotate focus through them.
    No category should go more than 2 consecutive days without being addressed.
    Include at least 1 workout per week for each major category: inside scoring, outside scoring, playmaking, defense, athleticism.
  `,
}

export const ENV_NOTES = {
  home:
    'Player trains at home — no basket access. Workouts must use ball handling, footwork, strength, and conditioning drills only. No shooting drills.',
  home_no_hoop:
    'Player trains at home with no hoop. Ball handling, footwork, strength, conditioning, and mental drills only — no shooting drills.',
  home_with_hoop:
    'Player trains at home with a hoop. Shooting, finishing, and ball skills are allowed; keep reps appropriate for driveway or half-court space.',
  court:
    'Player trains at a court with full basket access. All drill types are available.',
  hybrid:
    'Player has access to both home and court environments. Mix court and home workouts across the week. Label each day with its environment.',
}

/**
 * Normalize onboarding / build training environment to lowercase tokens.
 * @param {unknown} trainingEnvironment
 * @returns {string[]}
 */
export function normalizeTrainingEnvArray(trainingEnvironment) {
  if (Array.isArray(trainingEnvironment)) {
    return trainingEnvironment.map((x) => String(x).toLowerCase().trim()).filter(Boolean)
  }
  const s = String(trainingEnvironment ?? 'court').toLowerCase().trim()
  if (s === 'court') return ['court']
  if (s === 'home') return ['home_no_hoop']
  if (s === 'hybrid') return ['court', 'home_no_hoop', 'hybrid']
  return [s || 'court']
}

/**
 * Parse DB text (JSON array or legacy single value).
 * @param {unknown} val
 */
export function parseTrainingEnvironmentValue(val) {
  if (Array.isArray(val)) return normalizeTrainingEnvArray(val)
  if (val == null || val === '') return ['court']
  const s = String(val).trim()
  if (s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s)
      return normalizeTrainingEnvArray(parsed)
    } catch {
      return ['court']
    }
  }
  return normalizeTrainingEnvArray(s)
}

/**
 * Per-plan-day environment label for drills and UI.
 * @param {string} dayOfWeek
 * @param {unknown} trainingEnvironment — array of tokens or legacy string
 * @param {number} dayNumber — global plan day index (1-based)
 */
export function getEnvironmentForDay(_dayOfWeek, trainingEnvironment, dayNumber) {
  const arr = Array.isArray(trainingEnvironment)
    ? trainingEnvironment.map((x) => String(x).toLowerCase().trim()).filter(Boolean)
    : normalizeTrainingEnvArray(trainingEnvironment)
  const dn = Math.max(1, Math.round(Number(dayNumber) || 1))
  const hasCourtish = arr.includes('court') || arr.includes('hybrid')
  if (!hasCourtish) return 'home'
  return (dn - 1) % 2 === 0 ? 'court' : 'home'
}

const WEEK_STRUCTURE = [
  { dayOfWeek: 'Monday', type: 'workout', slot: 'primary' },
  { dayOfWeek: 'Tuesday', type: 'workout', slot: 'secondary' },
  { dayOfWeek: 'Wednesday', type: 'active_recovery', slot: 'recovery' },
  { dayOfWeek: 'Thursday', type: 'workout', slot: 'primary' },
  { dayOfWeek: 'Friday', type: 'workout', slot: 'secondary' },
  { dayOfWeek: 'Saturday', type: 'workout', slot: 'wildcard' },
  { dayOfWeek: 'Sunday', type: 'rest', slot: 'rest' },
]

const ATTRIBUTE_CATEGORIES = {
  inside_scoring: [
    'layup',
    'close_shot',
    'driving_dunk',
    'standing_dunk',
    'hands',
    'draw_foul',
    'post_control',
    'post_hook',
    'post_fade',
  ],
  outside_scoring: ['three_point', 'mid_range', 'free_throw', 'shot_iq', 'ocnst'],
  playmaking: ['ball_handle', 'pass_accuracy', 'pass_iq', 'pass_vision', 'speed_with_ball'],
  defense: [
    'perimeter_defense',
    'interior_defense',
    'block',
    'steal',
    'dreb',
    'oreb',
    'help_defense_iq',
    'dcnst',
    'pass_perception',
    'lateral_quickness',
  ],
  athleticism: ['speed', 'agility', 'vertical', 'strength', 'stamina', 'durability', 'hustle'],
  intangibles: ['intangibles', 'ocnst', 'dcnst'],
}

const PATH_CATEGORY_PRIORITY = {
  offensive: [
    'inside_scoring',
    'outside_scoring',
    'playmaking',
    'athleticism',
    'defense',
    'intangibles',
  ],
  defensive: [
    'defense',
    'athleticism',
    'intangibles',
    'inside_scoring',
    'outside_scoring',
    'playmaking',
  ],
  balanced: [
    'inside_scoring',
    'defense',
    'outside_scoring',
    'athleticism',
    'playmaking',
    'intangibles',
  ],
}

const WORKOUT_NAME_TEMPLATES = {
  inside_scoring: [
    'Finishing Lab',
    'Paint Work',
    'Interior Clinic',
    'Rim Attack Session',
    'Below the Rim Drills',
    'Contact Finishing',
    'Around the Basket',
  ],
  outside_scoring: [
    'Shooting Lab',
    'Catch & Shoot Clinic',
    'Shot Making Session',
    'Range Extension',
    'Pure Shooting Work',
    'Score Creation Drills',
    'Spot Up & Move',
  ],
  playmaking: [
    'Ball Handling Lab',
    'Court Vision Drills',
    'Passing Clinic',
    'Handle & Create',
    'Primary Handler Work',
    'Read & React Session',
    'Playmaking Fundamentals',
  ],
  defense: [
    'Lockdown Drills',
    'Defensive Footwork Lab',
    'On-Ball Defense Clinic',
    'Help Side Fundamentals',
    'Perimeter Defense Work',
    'Defensive IQ Session',
    'Stopper Drills',
  ],
  athleticism: [
    'Athletic Development',
    'Explosion Training',
    'Speed & Agility Work',
    'Conditioning Circuit',
    'Strength & Power Lab',
    'Movement Fundamentals',
    'Body Control Drills',
  ],
  intangibles: [
    'Mental Game Session',
    'IQ & Film Study',
    'Clutch Preparation',
    'Game Situation Drills',
    'Pressure Reps',
    'Competitive Drills',
    'High Stakes Reps',
  ],
}

const WEEK_THEMES = [
  'Foundation & Form',
  'Building Habits',
  'Raising the Floor',
  'Pushing the Ceiling',
  'Peak Performance',
  'Locked In',
  'No Days Off',
  'Full Send',
  'Maximum Pressure',
  'Elite Territory',
  'Finishing Strong',
  'Championship Mode',
]

const COACH_NOTES = {
  workout: [
    'Lock in. Every rep is a deposit into your future.',
    'The work you put in today shows up on the court tomorrow.',
    'Stay disciplined with your form — quality over quantity.',
    'Attack your weaknesses. That\'s where real growth happens.',
    'Push past comfortable. That\'s where improvement lives.',
    'No shortcuts. Do the work the right way.',
    'Trust the process. Your rating goes up one session at a time.',
    'Focus on the drill, not the clock. Be present.',
    'Championship habits are built in sessions like this one.',
    'Every elite player you watch put in reps like these.',
    'Compete against yourself. Be better than yesterday.',
    'The grind is the point. Embrace it.',
  ],
  active_recovery: [
    'Your body builds strength during recovery, not during work. Respect it.',
    'Light movement today keeps you sharp tomorrow.',
    'Active recovery is still training. Stay intentional.',
    'Stretch, breathe, reset. You\'ve earned it.',
    'Recovery is where the gains actually happen.',
    'Stay loose. Tomorrow is a big session.',
  ],
  rest: [
    'Full rest today. Your muscles are rebuilding.',
    'Rest is not weakness — it\'s part of the plan.',
    'Recover fully. Come back stronger tomorrow.',
    'Use today to visualize your game. Mental reps count.',
    'Eat well, sleep well, come back ready.',
    'The best players know when to rest. Today is that day.',
  ],
}

function isValidAttributeKey(key) {
  return typeof key === 'string' && ATTRIBUTE_KEYS.includes(key)
}

/** Do not allocate workout focus slots to attributes already at or above this rating. */
const TRAINABLE_ATTRIBUTE_MAX = 75
const LOW_DUNK_THRESHOLD = 40

function attrScore(attributes, key) {
  return Number(attributes[key]) || 50
}

function trainableKeysForCategory(category, attributes) {
  const keys = ATTRIBUTE_CATEGORIES[category] || []
  return keys.filter((k) => {
    if (!isValidAttributeKey(k)) return false
    const v = attrScore(attributes, k)
    if (v > TRAINABLE_ATTRIBUTE_MAX) return false
    if (category === 'inside_scoring' && k === 'driving_dunk' && v < LOW_DUNK_THRESHOLD) {
      return false
    }
    return true
  })
}

function categoryHasTrainable(category, attributes) {
  return trainableKeysForCategory(category, attributes).length > 0
}

/** First path-ordered category from startIdx (0-based) that still has trainable attributes. */
function firstTrainableCategory(path, attributes, startIdx) {
  const priority = PATH_CATEGORY_PRIORITY[path]
  if (!priority?.length) return null
  for (let j = 0; j < priority.length; j++) {
    const cat = priority[(startIdx + j) % priority.length]
    if (categoryHasTrainable(cat, attributes)) return cat
  }
  return null
}

function orderedTrainableKeysAcrossPath(path, attributes) {
  const priority = PATH_CATEGORY_PRIORITY[path] || []
  const out = []
  const seen = new Set()
  for (const cat of priority) {
    for (const k of trainableKeysForCategory(cat, attributes)) {
      if (seen.has(k)) continue
      seen.add(k)
      out.push(k)
    }
  }
  return out.sort((a, b) => attrScore(attributes, a) - attrScore(attributes, b))
}

function normalizePath(p) {
  const s = String(p || '').toLowerCase()
  if (s === 'offensive' || s === 'defensive' || s === 'balanced') return s
  return 'balanced'
}

function getIntensityForWeek(weekNumber) {
  if (weekNumber <= 2) return 'low'
  if (weekNumber <= 4) return 'medium'
  if (weekNumber <= 8) return 'high'
  return 'peak'
}

function getWeakestCategory(attributes, path) {
  const priority = PATH_CATEGORY_PRIORITY[path] || []
  let weakestCategory = null
  let lowestAvg = Infinity

  for (const category of priority) {
    const trainable = trainableKeysForCategory(category, attributes)
    if (!trainable.length) continue
    const avg =
      trainable.reduce((sum, key) => sum + attrScore(attributes, key), 0) / trainable.length
    if (avg < lowestAvg) {
      lowestAvg = avg
      weakestCategory = category
    }
  }

  return (
    weakestCategory ||
    firstTrainableCategory(path, attributes, 0) ||
    priority[0] ||
    'athleticism'
  )
}

function getSlotCategory(slot, weekNumber, path, attributes) {
  const priority = PATH_CATEGORY_PRIORITY[path] || []

  if (slot === 'primary') {
    const preferred = priority[0]
    if (categoryHasTrainable(preferred, attributes)) return preferred
    return (
      firstTrainableCategory(path, attributes, 1) ||
      firstTrainableCategory(path, attributes, 0) ||
      preferred ||
      'athleticism'
    )
  }

  if (slot === 'secondary') {
    const idx = (weekNumber % 3) + 1
    const preferred = priority[idx] ?? priority[0]
    if (categoryHasTrainable(preferred, attributes)) return preferred
    return (
      firstTrainableCategory(path, attributes, idx + 1) ||
      firstTrainableCategory(path, attributes, 0) ||
      preferred ||
      'athleticism'
    )
  }

  if (slot === 'wildcard') {
    return getWeakestCategory(attributes, path)
  }

  return null
}

function getFocusAttributes(category, attributes, weekNumber, path) {
  let pool = trainableKeysForCategory(category, attributes)
  if (pool.length === 0) {
    pool = orderedTrainableKeysAcrossPath(path, attributes)
  }
  if (pool.length === 0) {
    pool = [...ATTRIBUTE_KEYS]
      .sort((a, b) => attrScore(attributes, a) - attrScore(attributes, b))
      .slice(0, 8)
  }

  const sorted = [...pool].sort((a, b) => attrScore(attributes, a) - attrScore(attributes, b))

  const nPairs = Math.max(1, Math.floor(sorted.length / 2))
  const offset = (weekNumber - 1) % nPairs
  const start = offset * 2
  let pair = sorted.slice(start, start + 2).filter(isValidAttributeKey)

  if (pair.length < 2) {
    pair = sorted.filter(isValidAttributeKey).slice(0, 2)
  }
  if (pair.length === 1) {
    pair = [pair[0], pair[0]]
  }
  if (pair.length === 0) {
    pair = ['stamina', 'hustle'].filter(isValidAttributeKey)
  }

  return pair.slice(0, 2)
}

function getWorkoutName(category, weekNumber) {
  const templates = WORKOUT_NAME_TEMPLATES[category] || WORKOUT_NAME_TEMPLATES.athleticism
  return templates[(weekNumber - 1) % templates.length]
}

function getWeekTheme(weekNumber) {
  return WEEK_THEMES[(weekNumber - 1) % WEEK_THEMES.length]
}

function getPlanName(developmentPath, planDurationWeeks) {
  const pathLabel = {
    offensive: 'Offensive Development',
    defensive: 'Defensive Development',
    balanced: 'Complete Player',
  }[developmentPath] || 'Complete Player'

  return `${planDurationWeeks}-Week ${pathLabel} Plan`
}

function getPlanSummary(archetype, developmentPath, planDurationWeeks) {
  const pathDesc = {
    offensive: 'sharpen your scoring and offensive creation',
    defensive: 'build elite defensive instincts and physicality',
    balanced: 'develop every dimension of your game',
  }[developmentPath] || 'develop every dimension of your game'

  return `A ${planDurationWeeks}-week plan built to ${pathDesc}. Starting from your foundation and progressively increasing intensity week over week. Targeting your weakest attributes first to maximize real-world improvement.`
}

function getCoachNote(type, weekNumber, dayNumber) {
  const pool = COACH_NOTES[type] || COACH_NOTES.workout
  return pool[(weekNumber * dayNumber) % pool.length]
}

function getDurationMinutes(type, sessionDuration) {
  if (type === 'rest') return 0
  if (type === 'active_recovery') return 20

  const durationMap = {
    '20-30': 25,
    '30-45': 37,
    '45-60': 52,
    '60+': 65,
  }
  return durationMap[sessionDuration] || 40
}

/**
 * Deterministic full plan (no AI). Drills / xpRewards filled in Phase 5 per session.
 * @param {Record<string, unknown>} build
 * @param {Record<string, unknown>} onboardingData
 */
export function buildAlgorithmicPlan(build, onboardingData) {
  const archetype = String(build?.archetype || 'Prospect')
  const attributes =
    typeof build?.attributes === 'object' && build.attributes !== null ? build.attributes : {}

  const developmentPath = normalizePath(onboardingData?.developmentPath)
  const planDurationWeeks = Math.min(
    12,
    Math.max(4, parseInt(String(onboardingData?.planDurationWeeks ?? 8), 10) || 8),
  )
  const trainingEnvSource =
    onboardingData?.trainingEnvironment != null
      ? onboardingData.trainingEnvironment
      : build?.training_environment
  const trainingEnvironment = parseTrainingEnvironmentValue(trainingEnvSource)
  const sessionDuration = String(onboardingData?.sessionDuration || '30-45')

  const path = developmentPath
  const weeks = []

  for (let weekNum = 1; weekNum <= planDurationWeeks; weekNum++) {
    const intensity = getIntensityForWeek(weekNum)
    const weekTheme = getWeekTheme(weekNum)
    const days = []

    for (let i = 0; i < WEEK_STRUCTURE.length; i++) {
      const { dayOfWeek, type, slot } = WEEK_STRUCTURE[i]
      const dayNumber = (weekNum - 1) * 7 + (i + 1)

      let workoutName = ''
      let focusAttributes = []

      if (type === 'workout') {
        const category = getSlotCategory(slot, weekNum, path, attributes)
        focusAttributes = getFocusAttributes(category, attributes, weekNum, path)
        workoutName = getWorkoutName(category, weekNum)
      } else if (type === 'active_recovery') {
        workoutName = 'Active Recovery'
        focusAttributes = []
      } else {
        workoutName = 'Rest Day'
        focusAttributes = []
      }

      days.push({
        dayNumber,
        dayOfWeek,
        type,
        workoutName,
        focusAttributes,
        intensity:
          type === 'workout' ? intensity : type === 'active_recovery' ? 'low' : 'none',
        durationMinutes: getDurationMinutes(type, sessionDuration),
        environment: getEnvironmentForDay(dayOfWeek, trainingEnvironment, dayNumber),
        drills: [],
        xpRewards: {},
        coachNote: getCoachNote(type, weekNum, i + 1),
      })
    }

    weeks.push({
      weekNumber: weekNum,
      weekTheme,
      days,
    })
  }

  return {
    planName: getPlanName(path, planDurationWeeks),
    planSummary: getPlanSummary(archetype, path, planDurationWeeks),
    weeks,
  }
}

export async function updateDevelopmentPath(buildId, developmentPath) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const path = normalizePath(developmentPath)
  const { error } = await supabase
    .from('player_builds')
    .update({
      development_path: path,
      updated_at: new Date().toISOString(),
    })
    .eq('id', buildId)
  if (error) throw error
}

/**
 * @param {string} userId
 * @param {Record<string, unknown>} build
 * @param {Record<string, unknown>} onboardingData
 * @returns {Promise<{ planRow: object|null, planData: object }>}
 */
export async function generateWorkoutPlan(userId, build, onboardingData) {
  const planData = buildAlgorithmicPlan(build, onboardingData)

  if (!supabase) {
    useAppStore.getState().setCurrentWorkoutPlan({
      id: null,
      build_id: build.id,
      user_id: userId,
      plan_data: planData,
      current_day: 1,
    })
    return { planRow: null, planData }
  }

  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .insert({
        build_id: build.id,
        user_id: userId,
        plan_data: planData,
        current_day: 1,
      })
      .select()
      .single()

    if (error) throw error

    useAppStore.getState().setCurrentWorkoutPlan(data)
    return { planRow: data, planData: planData }
  } catch (err) {
    console.error('Failed to save plan to Supabase:', err)
    useAppStore.getState().setCurrentWorkoutPlan({
      id: null,
      build_id: build.id,
      user_id: userId,
      plan_data: planData,
      current_day: 1,
    })
    return { planRow: null, planData }
  }
}

/** Flatten all day objects in plan order (week 1 day 1 …). */
export function flattenPlanDays(planData) {
  if (!planData?.weeks?.length) return []
  const out = []
  for (const w of planData.weeks) {
    if (!w?.days?.length) continue
    for (const d of w.days) out.push(d)
  }
  return out
}

export function getPlanTotalDays(planData) {
  return flattenPlanDays(planData).length
}

/**
 * When the last workout was logged on a prior UTC day, advance `current_day` by one (at most once per UTC day).
 * Clears no log — only calendar catch-up. Requires `last_plan_roll_date` so repeated mounts the same day do not stack advances.
 * @param {Record<string, unknown>|null|undefined} planRow
 * @returns {Promise<Record<string, unknown>|null|undefined>}
 */
export async function syncWorkoutPlanCalendarDay(planRow) {
  if (!supabase || !planRow?.id) return planRow

  const today = utcDateString()
  const last = planRow.last_logged_date
  const lastRoll = planRow.last_plan_roll_date

  if (lastRoll === today) return planRow
  if (typeof last !== 'string' || !last || last >= today) return planRow

  const total = getPlanTotalDays(planRow.plan_data)
  const cur = Math.max(1, Math.round(Number(planRow.current_day) || 1))
  const next = Math.min(cur + 1, Math.max(total, 1) + 1)

  const { data, error } = await supabase
    .from('workout_plans')
    .update({
      current_day: next,
      last_plan_roll_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planRow.id)
    .select()
    .maybeSingle()

  if (error) {
    console.error('syncWorkoutPlanCalendarDay', error)
    return planRow
  }
  return data || planRow
}

/**
 * @param {object} planData
 * @param {number} currentDay — 1-based global index (matches workout_plans.current_day)
 */
export function getDayForCurrentPlanIndex(planData, currentDay) {
  const flat = flattenPlanDays(planData)
  if (!flat.length) return null
  const idx = Math.max(0, Math.min(flat.length - 1, (Number(currentDay) || 1) - 1))
  return { day: flat[idx], indexOneBased: idx + 1, totalDays: flat.length }
}

export function getPlanWeekMeta(planData, currentDay) {
  const totalWeeks = planData?.weeks?.length || 0
  if (!totalWeeks) return { weekNumber: 0, totalWeeks: 0 }
  const flat = flattenPlanDays(planData)
  if (!flat.length) return { weekNumber: 0, totalWeeks }
  const idx = Math.max(0, Math.min(flat.length - 1, (Number(currentDay) || 1) - 1))
  let acc = 0
  for (let wi = 0; wi < planData.weeks.length; wi++) {
    const len = planData.weeks[wi].days?.length || 0
    if (idx < acc + len) {
      return { weekNumber: wi + 1, totalWeeks }
    }
    acc += len
  }
  return { weekNumber: totalWeeks, totalWeeks }
}

export async function fetchWorkoutPlanForBuild(userId, buildId) {
  if (!supabase || !userId || !buildId) return null
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('build_id', buildId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data
}
