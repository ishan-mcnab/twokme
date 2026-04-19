/** 40 unique attribute keys used across builds + OVR. */
export const ATTRIBUTE_KEYS = [
  'speed',
  'acceleration',
  'agility',
  'vertical',
  'strength',
  'stamina',
  'durability',
  'hustle',
  'layup',
  'close_shot',
  'driving_dunk',
  'standing_dunk',
  'post_control',
  'post_hook',
  'post_fade',
  'mid_range',
  'moving_mid',
  'three_point',
  'moving_three',
  'free_throw',
  'shot_iq',
  'ocnst',
  'ball_handle',
  'speed_with_ball',
  'pass_accuracy',
  'pass_iq',
  'pass_vision',
  'pass_perception',
  'perimeter_defense',
  'interior_defense',
  'lateral_quickness',
  'block',
  'steal',
  'dreb',
  'oreb',
  'help_defense_iq',
  'dcnst',
  'hands',
  'draw_foul',
  'intangibles',
]

const BASE = 48

function clamp(n) {
  return Math.min(99, Math.max(1, Math.round(n)))
}

function createAccumulator() {
  const acc = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, { s: 0, w: 0 }]))
  return acc
}

function add(acc, key, value, weight = 1) {
  if (!acc[key]) return
  const v = Number(value)
  if (Number.isNaN(v)) return
  acc[key].s += v * weight
  acc[key].w += weight
}

function finalize(acc) {
  const out = {}
  for (const k of ATTRIBUTE_KEYS) {
    const { s, w } = acc[k]
    out[k] = w > 0 ? clamp(s / w) : BASE
  }
  return out
}

const MCQ = {
  ins_post: {
    none: 22,
    hold: 48,
    comfortable: 72,
    home: 92,
  },
  ins_dunk: {
    no: 15,
    easy: 42,
    traffic: 72,
    everyone: 94,
  },
  out_shot_iq: {
    open: 35,
    selective: 55,
    rare_bad: 76,
    right_shot: 92,
  },
  def_iq: {
    react: 30,
    some: 50,
    ahead: 72,
    everything: 90,
  },
  def_oreb: {
    never: 18,
    sometimes: 45,
    always: 68,
    relentless: 90,
  },
  int_clutch: {
    shrink: 28,
    same: 50,
    rise: 72,
    want_ball: 90,
  },
}

/**
 * @param {Record<string, unknown>} answers flat questionnaire keys
 * @param {{ position: string, heightInches: number|null, weightLbs: number|null }} meta
 */
export function buildAttributesFromAnswers(answers, meta) {
  const acc = createAccumulator()
  const pos = (meta.position || 'SF').toUpperCase()
  const h = meta.heightInches ?? 70

  const a = (key, def = BASE) => {
    const v = answers[key]
    return typeof v === 'number' && !Number.isNaN(v) ? v : def
  }

  // Athleticism
  add(acc, 'speed', a('ath_speed_agility'))
  add(acc, 'agility', a('ath_speed_agility'))
  add(acc, 'acceleration', a('ath_speed_agility'), 0.9)
  add(acc, 'lateral_quickness', a('ath_speed_agility'), 0.65)

  const ex = a('ath_explosiveness')
  add(acc, 'vertical', ex)
  add(acc, 'driving_dunk', ex, 0.55)
  add(acc, 'standing_dunk', ex, 0.5)

  add(acc, 'strength', a('ath_strength'))
  add(acc, 'stamina', a('ath_stamina'))
  add(acc, 'durability', a('ath_stamina'), 0.85)
  add(acc, 'hustle', a('ath_hustle'))

  // Inside scoring
  add(acc, 'layup', a('ins_finishing_rim'))
  add(acc, 'close_shot', a('ins_finishing_rim'), 0.85)
  add(acc, 'draw_foul', a('ins_draw_contact'))
  add(acc, 'hands', a('ins_hands'))

  if (answers.ins_post_game) {
    const p = MCQ.ins_post[answers.ins_post_game] ?? BASE
    add(acc, 'post_control', p)
    add(acc, 'post_hook', p, 0.9)
    add(acc, 'post_fade', p, 0.85)
  }

  if (answers.ins_dunk_ability) {
    const d = MCQ.ins_dunk[answers.ins_dunk_ability] ?? BASE
    add(acc, 'driving_dunk', d, 0.65)
    add(acc, 'standing_dunk', d, 0.75)
  }

  // Outside
  add(acc, 'three_point', a('out_three'))
  add(acc, 'moving_three', a('out_three'), 0.92)
  add(acc, 'mid_range', a('out_mid'))
  add(acc, 'moving_mid', a('out_mid'), 0.92)
  add(acc, 'free_throw', a('out_ft'))
  if (answers.out_shot_iq) {
    const s = MCQ.out_shot_iq[answers.out_shot_iq] ?? BASE
    add(acc, 'shot_iq', s)
    add(acc, 'ocnst', s, 0.55)
  }

  // Playmaking
  const role = answers.pm_ball_role
  const showHandle =
    role !== 'offball' &&
    (pos === 'PG' ||
      pos === 'SG' ||
      role === 'primary' ||
      answers.pm_handle != null)

  if (role === 'primary') {
    add(acc, 'ball_handle', 68, 0.35)
    add(acc, 'speed_with_ball', 66, 0.3)
  } else if (role === 'secondary') {
    add(acc, 'ball_handle', 58, 0.3)
    add(acc, 'speed_with_ball', 56, 0.25)
  } else if (role === 'offball') {
    add(acc, 'ball_handle', 46, 0.25)
    add(acc, 'speed_with_ball', 50, 0.2)
  }

  if (showHandle && answers.pm_handle != null) {
    add(acc, 'ball_handle', a('pm_handle'), 1)
    add(acc, 'speed_with_ball', a('pm_handle'), 0.85)
  }
  if (showHandle && answers.pm_vision != null) {
    add(acc, 'pass_vision', a('pm_vision'))
    add(acc, 'pass_iq', a('pm_vision'), 0.9)
  }
  add(acc, 'pass_accuracy', a('pm_pass_acc'))
  add(acc, 'pass_perception', a('pm_pass_acc'), 0.65)

  // Defense
  add(acc, 'perimeter_defense', a('def_perimeter'))
  add(acc, 'lateral_quickness', a('def_perimeter'), 0.45)
  if (answers.def_interior != null) {
    add(acc, 'interior_defense', a('def_interior'))
    add(acc, 'block', a('def_interior'), 0.75)
  }
  if (answers.def_iq) {
    const di = MCQ.def_iq[answers.def_iq] ?? BASE
    add(acc, 'help_defense_iq', di)
    add(acc, 'pass_perception', di, 0.45)
    add(acc, 'dcnst', di, 0.5)
  }
  add(acc, 'steal', a('def_steals'))
  add(acc, 'dreb', a('def_dreb'))
  if (answers.def_oreb) {
    const o = MCQ.def_oreb[answers.def_oreb] ?? BASE
    add(acc, 'oreb', o)
  }

  // Intangibles
  if (answers.int_clutch) {
    const c = MCQ.int_clutch[answers.int_clutch] ?? BASE
    add(acc, 'intangibles', c)
    add(acc, 'ocnst', c, 0.35)
  }
  add(acc, 'intangibles', a('int_impact'), 0.65)
  add(acc, 'ocnst', a('int_impact'), 0.45)
  add(acc, 'dcnst', a('int_impact'), 0.35)

  // Height / weight priors (subtle calibration)
  const heightMod = (h - 72) * 0.15
  add(acc, 'standing_dunk', 52 + heightMod, 0.25)
  add(acc, 'interior_defense', 52 + heightMod * 0.4, 0.2)
  const w = meta.weightLbs ?? 190
  const weightMod = (w - 190) * 0.04
  add(acc, 'strength', 52 + weightMod, 0.2)

  let attrs = finalize(acc)

  // Inference pass: fill weak links from neighbors
  attrs = inferDefaults(attrs, answers, meta)

  return attrs
}

function inferDefaults(attrs, answers, meta) {
  const next = { ...attrs }
  const blend = (k, v, t = 0.35) => {
    next[k] = clamp(next[k] * (1 - t) + v * t)
  }

  if (next.moving_mid < 40) blend('moving_mid', next.mid_range, 0.55)
  if (next.moving_three < 40) blend('moving_three', next.three_point, 0.55)
  if (next.acceleration < 40) blend('acceleration', (next.speed + next.agility) / 2, 0.6)
  if (next.pass_vision < 45 && answers.pm_vision == null) {
    blend('pass_vision', next.pass_accuracy * 0.95, 0.4)
    blend('pass_iq', next.pass_accuracy * 0.92, 0.35)
  }
  if (next.interior_defense < 42 && answers.def_interior == null) {
    const h = meta.heightInches ?? 72
    if (h >= 74 || meta.position === 'C' || meta.position === 'PF') {
      blend('interior_defense', (next.perimeter_defense + next.strength) / 2, 0.45)
      blend('block', next.vertical * 0.55 + next.strength * 0.35, 0.35)
    }
  }
  if (next.post_hook < 40 && !answers.ins_post_game) {
    blend('post_hook', next.close_shot * 0.85, 0.25)
    blend('post_fade', next.mid_range * 0.8, 0.25)
  }
  return next
}

const CAT = {
  inside: [
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
  outside: [
    'three_point',
    'moving_three',
    'mid_range',
    'moving_mid',
    'free_throw',
    'shot_iq',
    'ocnst',
  ],
  play: [
    'ball_handle',
    'pass_accuracy',
    'pass_iq',
    'pass_vision',
    'speed_with_ball',
  ],
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
  athletic: [
    'speed',
    'acceleration',
    'agility',
    'vertical',
    'strength',
    'stamina',
    'durability',
    'hustle',
  ],
  intang: ['intangibles', 'ocnst', 'dcnst'],
}

/** Position-specific category weights (sum = 1). */
const POSITION_WEIGHTS = {
  PG: {
    inside_scoring: 0.1,
    outside_scoring: 0.2,
    playmaking: 0.28,
    defense: 0.18,
    athleticism: 0.16,
    intangibles: 0.08,
  },
  SG: {
    inside_scoring: 0.14,
    outside_scoring: 0.24,
    playmaking: 0.18,
    defense: 0.18,
    athleticism: 0.16,
    intangibles: 0.1,
  },
  SF: {
    inside_scoring: 0.16,
    outside_scoring: 0.2,
    playmaking: 0.14,
    defense: 0.22,
    athleticism: 0.18,
    intangibles: 0.1,
  },
  PF: {
    inside_scoring: 0.22,
    outside_scoring: 0.14,
    playmaking: 0.1,
    defense: 0.26,
    athleticism: 0.18,
    intangibles: 0.1,
  },
  C: {
    inside_scoring: 0.26,
    outside_scoring: 0.08,
    playmaking: 0.08,
    defense: 0.3,
    athleticism: 0.18,
    intangibles: 0.1,
  },
}

const DEFAULT_WEIGHTS = {
  inside_scoring: 0.18,
  outside_scoring: 0.18,
  playmaking: 0.15,
  defense: 0.22,
  athleticism: 0.17,
  intangibles: 0.1,
}

function avgKeys(attrs, keys) {
  const vals = keys.map((k) => attrs[k]).filter((n) => typeof n === 'number')
  if (!vals.length) return BASE
  return vals.reduce((s, n) => s + n, 0) / vals.length
}

export function computeOVR(attrs, position) {
  const pos = (position || 'SF').toUpperCase()
  const w = POSITION_WEIGHTS[pos] || DEFAULT_WEIGHTS

  const inside = avgKeys(attrs, CAT.inside)
  const outside = avgKeys(attrs, CAT.outside)
  const play = avgKeys(attrs, CAT.play)
  const def = avgKeys(attrs, CAT.defense)
  const ath = avgKeys(attrs, CAT.athletic)
  const int = avgKeys(attrs, CAT.intang)

  const rawOVR =
    w.inside_scoring * inside +
    w.outside_scoring * outside +
    w.playmaking * play +
    w.defense * def +
    w.athleticism * ath +
    w.intangibles * int

  const curvedOVR = Math.round(40 + rawOVR * 0.65)
  return Math.min(99, Math.max(40, curvedOVR))
}

export function buildAttributesAndOVR(answers, meta) {
  const attributes = buildAttributesFromAnswers(answers, meta)
  const ovr = computeOVR(attributes, meta.position)
  return { attributes, ovr }
}

/** Six-axis values (0–100-ish) for radar / reveal UI. */
export function getRadarCategoryScores(attrs) {
  return {
    inside: avgKeys(attrs, CAT.inside),
    outside: avgKeys(attrs, CAT.outside),
    playmaking: avgKeys(attrs, CAT.play),
    defense: avgKeys(attrs, CAT.defense),
    athleticism: avgKeys(attrs, CAT.athletic),
    intangibles: avgKeys(attrs, CAT.intang),
  }
}
