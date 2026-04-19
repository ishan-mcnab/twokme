import { supabase } from './supabase'
import { ATTRIBUTE_KEYS } from './attributeMapping'
import useAppStore from '../store/useAppStore'

/**
 * Re-fetch `attribute_progress` and merge `current_value` into Zustand `currentBuild.attributes`.
 * @returns {{ attributes: Record<string, number>, xpByKey: Record<string, number> } | null}
 */
export async function syncAttributesToStore(userId, buildId, setCurrentBuild, currentBuild) {
  if (!supabase || !userId || !buildId) return null

  const { data, error } = await supabase
    .from('attribute_progress')
    .select('attribute_key, current_value, total_xp')
    .eq('user_id', userId)
    .eq('build_id', buildId)

  if (error || !Array.isArray(data)) return null

  const updatedAttributes = {}
  const xpByKey = {}
  data.forEach((row) => {
    updatedAttributes[row.attribute_key] = Number(row.current_value)
    xpByKey[row.attribute_key] = Number(row.total_xp) || 0
  })

  const fresh = useAppStore.getState().currentBuild
  let base = fresh?.id === buildId ? fresh : null
  if (!base && currentBuild?.id === buildId) base = currentBuild
  if (!base?.id) return { attributes: updatedAttributes, xpByKey }

  const mergedAttributes = {
    ...(typeof base.attributes === 'object' && base.attributes !== null ? base.attributes : {}),
    ...updatedAttributes,
  }

  setCurrentBuild({
    ...base,
    attributes: mergedAttributes,
  })

  return { attributes: mergedAttributes, xpByKey }
}

/**
 * Returns true if the user has a row in `profiles` (used for post-login routing).
 */
export async function userHasProfile(userId) {
  if (!supabase) return false

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (error) return false
  return !!data
}

/**
 * Persists onboarding completion: profile upsert, player_build insert, attribute_progress rows.
 * @returns {{ buildId: string }}
 */
export async function saveOnboardingData(userId, onboardingData, attributes, ovr) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const username =
    (onboardingData.username || onboardingData.name || 'Player').trim() ||
    'Player'

  const profilePayload = {
    id: userId,
    username,
    full_name: username,
    position: onboardingData.position,
    height_inches: onboardingData.heightInches,
    weight_lbs: onboardingData.weightLbs,
    updated_at: new Date().toISOString(),
  }

  const { error: pErr } = await supabase.from('profiles').upsert(profilePayload)
  if (pErr) throw pErr

  const buildPayload = {
    user_id: userId,
    archetype: null,
    archetype_flavor_text: null,
    player_comps: null,
    overall_rating: ovr,
    attributes,
    development_path: onboardingData.developmentPath || 'balanced',
    plan_duration_weeks: onboardingData.planDurationWeeks,
    training_environment: Array.isArray(onboardingData.trainingEnvironment)
      ? JSON.stringify(onboardingData.trainingEnvironment)
      : onboardingData.trainingEnvironment ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data: build, error: bErr } = await supabase
    .from('player_builds')
    .insert(buildPayload)
    .select('id')
    .single()

  if (bErr) throw bErr

  const rows = ATTRIBUTE_KEYS.map((attribute_key) => ({
    user_id: userId,
    build_id: build.id,
    attribute_key,
    current_value: attributes[attribute_key],
    total_xp: 0,
    updated_at: new Date().toISOString(),
  }))

  const { error: apErr } = await supabase.from('attribute_progress').insert(rows)
  if (apErr) throw apErr

  return { buildId: build.id }
}
