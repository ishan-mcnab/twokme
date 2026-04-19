import { supabase } from './supabase'

export function isSupabaseConfigured() {
  return !!supabase
}

export async function signInWithEmail(email, password) {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(email, password) {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase.auth.signUp({ email, password })
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}
