import { supabase } from './supabase'
import { callAI } from './openrouter'
import { ARCHETYPE_PROFILES } from './archetypeProfilesData.js'
import { APPROVED_PLAYER_COMPS } from './approvedPlayerComps.js'

export { ARCHETYPE_PROFILES } from './archetypeProfilesData.js'

const SYSTEM_PROMPT =
  'You are a 2K basketball archetype analyst. You analyze real players\' skill profiles and assign them the most accurate NBA 2K-style archetype. You write with confidence, energy, and authenticity — like a scout who really knows the game.'

function attrVal(attrs, key) {
  const v = Number(attrs[key])
  return Number.isFinite(v) ? v : 50
}

function scoreArchetypeAgainstProfile(attributes, profile) {
  let raw = 0
  let max = 0
  for (const a of profile.primaryAttributes || []) {
    raw += attrVal(attributes, a) * 3
    max += 99 * 3
  }
  for (const a of profile.secondaryAttributes || []) {
    raw += attrVal(attributes, a) * 1.5
    max += 99 * 1.5
  }
  if (max <= 0) return 0
  return (raw / max) * 100
}

/**
 * Hard gate: archetype `positions` must match the player's declared role
 * (e.g. PF/C never use profiles that only list guards/wings with no big slot).
 * @param {string[]} profilePositions
 * @param {string} declaredPos
 */
export function profileMatchesDeclaredPosition(profilePositions, declaredPos) {
  const p = (declaredPos || 'SF').toUpperCase()
  const arr = Array.isArray(profilePositions) ? profilePositions : []
  if (!arr.length) return false

  if (p === 'PF' || p === 'C') {
    if (!arr.some((x) => x === 'PF' || x === 'C')) return false
    return true
  }
  if (p === 'PG' || p === 'SG') {
    if (!arr.some((x) => x === 'PG' || x === 'SG')) return false
    if (arr.every((x) => x === 'PF' || x === 'C')) return false
    return true
  }
  return arr.includes(p)
}

/**
 * @returns {{ name: string, score: number }[]}
 */
export function getNarrowedArchetypes(attributes, position) {
  const pos = (position || 'SF').toUpperCase()
  const scored = []
  for (const [name, profile] of Object.entries(ARCHETYPE_PROFILES)) {
    if (!profileMatchesDeclaredPosition(profile.positions, pos)) continue
    const score = scoreArchetypeAgainstProfile(attributes, profile)
    scored.push({ name, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 10)
}

function topAttributesSummary(attributes, n = 8) {
  return Object.entries(attributes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
}

function formatHeight(heightInches) {
  if (heightInches == null || Number.isNaN(heightInches)) return { ft: 6, inch: 0 }
  const hi = Math.round(heightInches)
  return { ft: Math.floor(hi / 12), inch: hi % 12 }
}

export function stripAndParseJson(text) {
  let s = String(text).trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object in response')
  return JSON.parse(s.slice(start, end + 1))
}

function normalizeCompName(s) {
  return String(s).trim()
}

function isApprovedComp(name) {
  const n = normalizeCompName(name).toLowerCase()
  return APPROVED_PLAYER_COMPS.some((p) => p.toLowerCase() === n)
}

/** Exact comp-selection rules for AI prompts (archetype + position interpolation). */
function playerCompsRulesBlock(archetype, position) {
  const pos = (position || 'SF').toUpperCase()
  return `PLAYER COMPS RULES — READ CAREFULLY:* *- You MUST pick comps that match this specific archetype: ${archetype}* *- You MUST pick comps that play the same position: ${pos}* *- A ${pos} should NEVER be comped to a player who primarily played a different position* *- Do NOT pick comps alphabetically or randomly — analyze the archetype name and attribute profile and pick the 3 most genuinely similar NBA players* *- Think carefully: what real NBA players best embody the ${archetype} archetype at the ${pos} position?* *- Only AFTER thinking through the archetype and position should you select from the approved list`
}

function pickRandomApprovedComps(n = 3) {
  const pool = [...APPROVED_PLAYER_COMPS]
  const out = []
  while (out.length < n && pool.length) {
    const i = Math.floor(Math.random() * pool.length)
    out.push(pool.splice(i, 1)[0])
  }
  return out
}

function pickFallbackComps() {
  return pickRandomApprovedComps(3)
}

function padCompsToThree(comps) {
  const out = [...comps]
  while (out.length < 3) {
    const pool = APPROVED_PLAYER_COMPS.filter((p) => !out.includes(p))
    if (!pool.length) break
    out.push(pool[Math.floor(Math.random() * pool.length)])
  }
  return out.slice(0, 3)
}

/**
 * Dedupe comps in first-seen order while keeping the reason aligned to that slot,
 * then pad to three comps with matching default reasons (fixes duplicate comps
 * breaking compReasons index alignment after `[...new Set(comps)]`).
 */
function mergeCompsAndReasonsAfterValidation(comps, reasonsRaw, defaultReason) {
  const reasons = (reasonsRaw || []).map((r) => String(r).trim())
  const pairs = []
  for (let i = 0; i < comps.length; i++) {
    const c = comps[i]
    if (!c) continue
    pairs.push({ comp: c, reason: reasons[i] ?? '' })
  }
  const seen = new Set()
  const uniqComps = []
  const uniqReasons = []
  for (const { comp, reason } of pairs) {
    const k = comp.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    uniqComps.push(comp)
    uniqReasons.push(reason)
  }
  const basis = uniqComps.slice(0, 3)
  const basisReasons = uniqReasons.slice(0, basis.length)
  const playerComps = padCompsToThree(basis)
  const compReasons = [...basisReasons]
  while (compReasons.length < playerComps.length) {
    compReasons.push(defaultReason)
  }
  return { playerComps, compReasons: compReasons.slice(0, 3) }
}

function buildFallbackResult(topCandidateName) {
  return {
    archetype: topCandidateName,
    flavorText:
      'Your numbers paint a clear picture — high motor, sharp reads, and a game built to translate night after night. This archetype fits how you actually impact winning.',
    playerComps: pickFallbackComps(),
    compReasons: [
      'Versatile skillset in the same mold.',
      'Comparable two-way discipline and pace.',
      'Shared knack for making the right play under pressure.',
    ],
    usedFallback: true,
  }
}

/**
 * @param {Record<string, number>} attributes
 * @param {string} position
 * @param {number|null} heightInches
 * @param {number|null} weightLbs
 * @param {{ name: string, score: number }[]} narrowedCandidates
 */
export async function generateArchetype(
  attributes,
  position,
  heightInches,
  weightLbs,
  narrowedCandidates,
) {
  const pos = (position || 'SF').toUpperCase()
  const names = narrowedCandidates.map((c) => c.name)
  if (!names.length) {
    return buildFallbackResult('Prospect')
  }

  const { ft, inch } = formatHeight(heightInches)
  const w = weightLbs ?? '—'

  const userPrompt = `A ${pos} player has completed their skill assessment. Here are their top attributes:

${topAttributesSummary(attributes)}

Full attribute profile:
${JSON.stringify(attributes)}

Physical: ${ft}'${inch}" | ${pos} | ${w} lbs

From these 10 candidate archetypes, pick the SINGLE best fit:
${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Also select 3 NBA player comps (current or past players) from this approved list:
${APPROVED_PLAYER_COMPS.join(', ')}

${playerCompsRulesBlock(
    `the archetype you output in JSON (exactly one of: ${names.join(', ')})`,
    pos,
  )}

Respond ONLY with valid JSON in this exact format:
{
  "archetype": "exact archetype name from the candidates list",
  "flavorText": "2-3 sentences describing this player's game with energy and authenticity. Reference their strengths specifically.",
  "playerComps": ["Player Name 1", "Player Name 2", "Player Name 3"],
  "compReasons": ["One sentence why comp 1 fits", "One sentence why comp 2 fits", "One sentence why comp 3 fits"]
}`

  const tryParse = async () => {
    const raw = await callAI(SYSTEM_PROMPT, userPrompt)
    const parsed = stripAndParseJson(raw)
    if (!parsed.archetype || !parsed.flavorText || !Array.isArray(parsed.playerComps)) {
      throw new Error('Malformed archetype JSON')
    }
    const arch = String(parsed.archetype).trim()
    if (!names.includes(arch)) {
      const loose = names.find((n) => n.toLowerCase() === arch.toLowerCase())
      if (!loose) throw new Error('Archetype not in candidate list')
      parsed.archetype = loose
    }
    const comps = parsed.playerComps.map(normalizeCompName).filter(Boolean)
    for (let i = 0; i < comps.length; i++) {
      if (!isApprovedComp(comps[i])) {
        const found = APPROVED_PLAYER_COMPS.find(
          (p) => p.toLowerCase() === comps[i].toLowerCase(),
        )
        if (found) comps[i] = found
        else throw new Error('Invalid player comp')
      }
    }
    const { playerComps, compReasons } = mergeCompsAndReasonsAfterValidation(
      comps,
      parsed.compReasons,
      'Strong stylistic overlap with your skill profile.',
    )
    return {
      archetype: parsed.archetype,
      flavorText: String(parsed.flavorText).trim(),
      playerComps,
      compReasons,
      usedFallback: false,
    }
  }

  try {
    return await tryParse()
  } catch {
    try {
      return await tryParse()
    } catch {
      return buildFallbackResult(names[0])
    }
  }
}

export async function saveArchetypeToSupabase(
  buildId,
  { archetype, flavorText, playerComps, compReasons, overall_rating },
) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const patch = {
    archetype,
    archetype_flavor_text: flavorText,
    player_comps: { names: playerComps, reasons: compReasons },
    updated_at: new Date().toISOString(),
  }
  if (overall_rating != null && Number.isFinite(Number(overall_rating))) {
    patch.overall_rating = Math.round(Number(overall_rating))
  }

  const { error } = await supabase.from('player_builds').update(patch).eq('id', buildId)

  if (error) throw error
}

const EVOLUTION_MAX_MS = 5000
const EVOLUTION_MAX_TOKENS = 500

/**
 * @param {string} newArchetype
 * @param {Record<string, number>} attributes
 * @param {string} position
 * @param {number|null} heightInches
 * @param {string[]} [_playerComps]
 */
export async function generateEvolutionFlavor(
  newArchetype,
  attributes,
  position,
  heightInches,
  _playerComps,
) {
  void _playerComps
  const arch = String(newArchetype || '').trim()
  const pos = (position || 'SF').toUpperCase()
  const attrs = attributes && typeof attributes === 'object' ? attributes : {}
  const { ft, inch } = formatHeight(heightInches)

  const fallbackText = `${arch}. The grind changed your game. Your attributes don't lie — you've become a different player.`
  const fallback = () => ({
    flavorText: fallbackText,
    playerComps: pickFallbackComps(),
    compReasons: [
      'Your updated profile mirrors this player’s evolution arc.',
      'Similar two-way habits after leveling up your skills.',
      'Shared identity as a player who outworked their old label.',
    ],
    usedFallback: true,
  })

  const userPrompt = `This player has just evolved to the "${arch}" archetype through real training and grind.

Their current attribute profile:
${topAttributesSummary(attrs, 12)}

Full attribute profile:
${JSON.stringify(attrs)}

Position: ${pos}
Height: ${ft}'${inch}"

The archetype has already been determined as "${arch}". Do not pick a different archetype. Write flavor text only for this archetype and pick 3 NBA player comps from this approved list (names must match exactly):
${APPROVED_PLAYER_COMPS.join(', ')}

${playerCompsRulesBlock(arch, pos)}

Respond ONLY with valid JSON:
{
  "flavorText": "2-3 sentences with energy. Acknowledge the evolution — they leveled up.",
  "playerComps": ["Player 1", "Player 2", "Player 3"],
  "compReasons": ["reason 1", "reason 2", "reason 3"]
}`

  const run = async () => {
    const raw = await callAI(SYSTEM_PROMPT, userPrompt, { maxTokens: EVOLUTION_MAX_TOKENS })
    const parsed = stripAndParseJson(raw)
    if (!parsed.flavorText || !Array.isArray(parsed.playerComps)) {
      throw new Error('Malformed evolution JSON')
    }
    const comps = parsed.playerComps.map(normalizeCompName).filter(Boolean)
    for (let i = 0; i < comps.length; i++) {
      if (!isApprovedComp(comps[i])) {
        const found = APPROVED_PLAYER_COMPS.find((p) => p.toLowerCase() === comps[i].toLowerCase())
        if (found) comps[i] = found
        else throw new Error('Invalid player comp')
      }
    }
    const { playerComps, compReasons } = mergeCompsAndReasonsAfterValidation(
      comps,
      parsed.compReasons,
      'Strong fit for how your game evolved.',
    )
    return {
      flavorText: String(parsed.flavorText).trim(),
      playerComps,
      compReasons,
      usedFallback: false,
    }
  }

  try {
    return await Promise.race([
      run(),
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error('timeout')), EVOLUTION_MAX_MS)
      }),
    ])
  } catch {
    return fallback()
  }
}

export async function fetchLatestPlayerBuildForUser(userId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('player_builds')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data
}
