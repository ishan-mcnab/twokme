import { getNarrowedArchetypes } from './archetypeEngine'

/**
 * @param {{ archetype?: string|null }} currentBuild
 * @param {Record<string, number>} currentAttributes
 * @param {string} [position]
 * @returns {null | { newArchetype: string, newScore: number, oldArchetype: string, scoreDiff: number }}
 */
export function checkForEvolution(currentBuild, currentAttributes, position = 'SF') {
  const currentArchetype = currentBuild?.archetype
  if (!currentArchetype || typeof currentAttributes !== 'object' || !currentAttributes) {
    return null
  }

  const candidates = getNarrowedArchetypes(currentAttributes, position)
  const topCandidate = candidates[0]
  if (!topCandidate?.name) return null

  if (topCandidate.name === currentArchetype) return null

  const currentRow = candidates.find((c) => c.name === currentArchetype)
  const currentArchetypeScore = currentRow?.score ?? 0
  const scoreDiff = topCandidate.score - currentArchetypeScore

  if (scoreDiff < 5) return null

  return {
    newArchetype: topCandidate.name,
    newScore: topCandidate.score,
    oldArchetype: currentArchetype,
    scoreDiff,
  }
}
