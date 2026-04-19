import { callAI } from './openrouter'
import { ATTRIBUTE_KEYS } from './attributeMapping'
import { ENV_NOTES, parseTrainingEnvironmentValue } from './planGenerator'

const SYSTEM_PROMPT = `You are an elite basketball skills coach. You create specific, executable basketball drills for individual players based on their skill level and training environment. Your drills are practical, detailed, and progressive. Write with energy and authenticity.`

const DRILL_GEN_MAX_TOKENS = 1000

const DRILL_COUNT = {
  25: 4,
  37: 5,
  52: 6,
  65: 7,
}

const ENV_CONSTRAINTS = {
  home_no_hoop:
    'No basket available. Use ball handling, footwork, strength, conditioning, and mental drills only. No shooting drills.',
  home: 'No basket available. Use ball handling, footwork, strength, conditioning, and mental drills only. No shooting drills.',
  home_with_hoop:
    'Home with a hoop: shooting and finishing drills are allowed; still keep drills realistic for limited space (driveway / half-court).',
  court:
    'Full court and basket access. All drill types available including shooting, finishing, and live game situations.',
  hybrid: (env) =>
    `Environment today is ${env}. Apply home_no_hoop rules if that environment, home_with_hoop rules if that, otherwise court rules.`,
}

function drillEnvKey(env) {
  const e = String(env || 'court').toLowerCase()
  if (e === 'home') return 'home_no_hoop'
  return e
}

function buildDrillConstraintFromSelections(workoutEnv, trainingEnvTokens) {
  const env = drillEnvKey(workoutEnv)
  const tokens = Array.isArray(trainingEnvTokens)
    ? trainingEnvTokens.map((t) => String(t).toLowerCase().trim()).filter(Boolean)
    : parseTrainingEnvironmentValue(trainingEnvTokens)

  const onlyHomeNoHoop =
    tokens.length > 0 && tokens.every((t) => t === 'home_no_hoop' || t === 'home')
  const shootingAllowed =
    !onlyHomeNoHoop &&
    (tokens.length === 0 ||
      tokens.includes('court') ||
      tokens.includes('home_with_hoop') ||
      tokens.includes('hybrid'))

  if (!shootingAllowed) return ENV_CONSTRAINTS.home_no_hoop

  if (env === 'court') return ENV_CONSTRAINTS.court
  if (env === 'home_with_hoop') return ENV_CONSTRAINTS.home_with_hoop
  if (env === 'home_no_hoop') return ENV_CONSTRAINTS.home_no_hoop
  return ENV_CONSTRAINTS.hybrid(env)
}

/** @param {number} value */
export function describeAttributeLevel(value) {
  const v = Number(value) || 50
  if (v < 40) return 'beginner'
  if (v < 55) return 'developing'
  if (v < 70) return 'average'
  if (v < 82) return 'good'
  if (v < 92) return 'elite'
  return 'max'
}

export function buildAttributeLevels(focusAttributes, attributes) {
  const attrs = attributes && typeof attributes === 'object' ? attributes : {}
  return (Array.isArray(focusAttributes) ? focusAttributes : [])
    .map(
      (attr) =>
        `${attr}: ${describeAttributeLevel(attrs[attr])} (${attrs[attr] != null ? attrs[attr] : 50})`,
    )
    .join(', ')
}

function parseDrillJsonArray(text) {
  let s = String(text).trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = s.indexOf('[')
  const end = s.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON array in response')
  return JSON.parse(s.slice(start, end + 1))
}

function isValidDrill(d) {
  return (
    d &&
    typeof d === 'object' &&
    typeof d.name === 'string' &&
    typeof d.attributeTarget === 'string' &&
    ATTRIBUTE_KEYS.includes(d.attributeTarget) &&
    typeof d.duration === 'string' &&
    typeof d.description === 'string' &&
    Number.isFinite(Number(d.xp))
  )
}

export function getDrillCount(durationMinutes) {
  const d = Number(durationMinutes) || 37
  return DRILL_COUNT[d] ?? DRILL_COUNT[37]
}

function buildTemplatesForKey(key) {
  const label = String(key).replaceAll('_', ' ')
  return [
    {
      name: `${label} — quality reps`,
      duration: '3 sets · 45 seconds',
      description: `Slow it down: perfect positions first, then add pace. Stay in control on every ${label} rep — no sloppy finishes.`,
      xp: 20,
    },
    {
      name: `${label} — circuit`,
      duration: '4 rounds · 1 minute each',
      description: `Work in short bursts with full focus on ${label}. Reset your breathing between rounds and track one cue word each set.`,
      xp: 24,
    },
  ]
}

export const FALLBACK_DRILL_TEMPLATES = Object.fromEntries(
  ATTRIBUTE_KEYS.map((k) => [k, buildTemplatesForKey(k)]),
)

/**
 * @param {Record<string, unknown>} workout
 * @param {Record<string, unknown>} build
 */
export function buildFallbackDrills(workout, build) {
  let focus = Array.isArray(workout?.focusAttributes) ? workout.focusAttributes : []
  if (!focus.length) {
    const attrs =
      typeof build?.attributes === 'object' && build.attributes !== null ? build.attributes : {}
    const ranked = Object.entries(attrs).sort((a, b) => a[1] - b[1])
    focus = ranked.slice(0, 3).map(([k]) => k)
    if (!focus.length) focus = ['stamina', 'ball_handle', 'three_point']
  }
  const count = getDrillCount(Number(workout?.durationMinutes) || 37)
  const out = []
  for (let i = 0; i < count; i++) {
    const attr = focus[i % Math.max(1, focus.length)] || 'stamina'
    const templates = FALLBACK_DRILL_TEMPLATES[attr] || FALLBACK_DRILL_TEMPLATES.stamina
    const t = templates[i % templates.length]
    out.push({
      name: t.name,
      attributeTarget: attr,
      duration: t.duration,
      description: t.description,
      xp: Math.max(10, Math.min(45, t.xp)),
    })
  }
  return out
}

/**
 * @param {Record<string, unknown>} workout
 * @param {Record<string, unknown>} build
 * @param {Record<string, unknown>} onboardingData
 * @returns {Promise<Array<{ name: string, attributeTarget: string, duration: string, description: string, xp: number }>>}
 */
export async function generateDrillsForWorkout(workout, build, onboardingData) {
  const position = String(onboardingData?.position || 'SF').toUpperCase()
  const archetype = String(build?.archetype || 'Prospect')
  const ovr = Number(build?.overall_rating) || 70
  const attrs =
    typeof build?.attributes === 'object' && build.attributes !== null ? build.attributes : {}
  const focus = Array.isArray(workout?.focusAttributes) ? workout.focusAttributes : []
  const intensity = String(workout?.intensity || 'medium').toLowerCase()
  const durationMinutes = Number(workout?.durationMinutes) || 37
  const env = drillEnvKey(workout?.environment)
  const trainingTokens = parseTrainingEnvironmentValue(
    onboardingData?.trainingEnvironment ?? build?.training_environment,
  )

  const drillCount = getDrillCount(durationMinutes)
  const envNoteKey = env === 'home' ? 'home_no_hoop' : env
  const environmentNote = ENV_NOTES[envNoteKey] || ENV_NOTES[env] || ENV_NOTES.court
  const environmentConstraint = buildDrillConstraintFromSelections(env, trainingTokens)

  const userPrompt = `Generate ${drillCount} basketball drills for this workout session:

PLAYER: ${position} | ${archetype} | OVR ${ovr}
SESSION: ${workout?.workoutName || 'Workout'} | ${intensity} intensity | ${durationMinutes} min
ENVIRONMENT: ${env} (${environmentNote})
FOCUS ATTRIBUTES: ${focus.join(', ') || 'general conditioning'}
PLAYER LEVEL for these attributes: ${buildAttributeLevels(focus, attrs)}

RULES:
- Drills must be executable in a ${env} environment
- ${environmentConstraint}
- Each drill targets one of the focus attributes
- Intensity matches "${intensity}" level
- Total drill time should fit within ${durationMinutes} minutes
- Be specific: name the drill, describe exactly what to do, give sets/reps or duration
- Vary the drill types — don't repeat the same format

Respond ONLY with valid JSON array:
[
  {
    "name": "string — creative drill name",
    "attributeTarget": "attribute_key",
    "duration": "string — e.g. '3 sets of 10' or '5 minutes' or '4 sets of 30 sec'",
    "description": "string — exactly what to do, 2-3 sentences, specific and actionable",
    "xp": number between 10 and 45
  }
]`

  try {
    const raw = await callAI(SYSTEM_PROMPT, userPrompt, { maxTokens: DRILL_GEN_MAX_TOKENS })
    const arr = parseDrillJsonArray(raw)
    if (!Array.isArray(arr) || arr.length < 2) throw new Error('Invalid drills')
    const cleaned = arr.filter(isValidDrill).map((d) => ({
      name: String(d.name).slice(0, 120),
      attributeTarget: d.attributeTarget,
      duration: String(d.duration).slice(0, 80),
      description: String(d.description).slice(0, 500),
      xp: Math.max(10, Math.min(45, Math.round(Number(d.xp)))),
    }))
    if (cleaned.length < 2) throw new Error('Too few valid drills')
    return cleaned.slice(0, drillCount)
  } catch {
    return buildFallbackDrills(workout, build)
  }
}
