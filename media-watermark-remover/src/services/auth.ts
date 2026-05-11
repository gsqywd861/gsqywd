import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return supabase
}

export async function signUp(email: string, password: string): Promise<User> {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error || !data.user) throw new Error(error?.message || '注册失败')
  return data.user
}

export async function signIn(email: string, password: string): Promise<User> {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) throw new Error(error?.message || '登录失败')
  return data.user
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export function onAuthStateChange(callback: (user: User | null) => void): { unsubscribe: () => void } {
  const supabase = getSupabase()
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null)
  })
  return { unsubscribe: () => subscription.unsubscribe() }
}
