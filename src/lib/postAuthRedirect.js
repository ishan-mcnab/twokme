import { userHasProfile } from './profile'

export async function resolvePostLoginPath(userId) {
  const hasProfile = await userHasProfile(userId)
  return hasProfile ? '/dashboard' : '/onboarding'
}
