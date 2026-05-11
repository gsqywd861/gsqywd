import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return supabase
}

export interface CloudTaskRecord {
  id: string
  user_id: string
  type: string
  input_file_name: string
  output_file_name: string | null
  status: string
  progress: number
  params: Record<string, any>
  created_at: string
  completed_at: string | null
}

export async function syncTasksToCloud(
  tasks: Array<{ id: string; userId: string | null; type: string; inputFileName: string; status: string; progress: number; params: Record<string, any>; createdAt: Date; completedAt: Date | null }>
): Promise<void> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const records = tasks
    .filter(t => t.userId === user.id)
    .map(t => ({
      id: t.id,
      user_id: user.id,
      type: t.type,
      input_file_name: t.inputFileName,
      output_file_name: null,
      status: t.status,
      progress: t.progress,
      params: t.params,
      created_at: t.createdAt.toISOString(),
      completed_at: t.completedAt?.toISOString() || null
    }))

  if (records.length > 0) {
    await supabase.from('tasks').upsert(records)
  }
}

export async function loadTasksFromCloud(): Promise<CloudTaskRecord[]> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}
