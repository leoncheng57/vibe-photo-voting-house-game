import { createClient } from '@supabase/supabase-js'
import type { AppId } from '../config/apps'
import { getActiveAppId } from './active-app'

// ----- credentials -----

// Vite substitutes import.meta.env.X statically at build time, so every
// variable has to be spelled out here; an indexed lookup resolves to undefined
// in a production build. Each app falls back to the shared pair, which is what
// lets both apps run against one Supabase project until a second one exists.
const CREDENTIALS_BY_APP: Record<AppId, { url?: string; publishableKey?: string }> = {
  'house-party': {
    url: import.meta.env.VITE_SUPABASE_URL_HOUSE_PARTY ?? import.meta.env.VITE_SUPABASE_URL,
    publishableKey:
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY_HOUSE_PARTY
      ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
  'bday-hunt': {
    url: import.meta.env.VITE_SUPABASE_URL_BDAY_HUNT ?? import.meta.env.VITE_SUPABASE_URL,
    publishableKey:
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY_BDAY_HUNT
      ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
}

const { url, publishableKey } = CREDENTIALS_BY_APP[getActiveAppId()]

// ----- client -----

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
