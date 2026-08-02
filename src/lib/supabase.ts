import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

function dashboardUrl(path: string): string | undefined {
  if (!url) return undefined
  try {
    const projectRef = new URL(url).hostname.split('.')[0]
    return projectRef ? `https://supabase.com/dashboard/project/${projectRef}/${path}` : undefined
  } catch {
    return undefined
  }
}

export const isSupabaseConfigured = Boolean(url && publishableKey)
export const supabase = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

export const supabaseSqlEditorUrl = dashboardUrl('sql/new')
