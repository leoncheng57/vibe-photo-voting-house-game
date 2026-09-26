import { createClient } from '@supabase/supabase-js'
import { getActiveThemeSurface } from './active-app'
import { resolveCredentials } from './credentials'

// ----- credentials -----

// Vite substitutes import.meta.env.X statically at build time, so every
// variable has to be spelled out here; an indexed lookup resolves to undefined
// in a production build. resolveCredentials decides which pair a page uses.
const { url, publishableKey } = resolveCredentials(
  getActiveThemeSurface(),
  {
    url: import.meta.env.VITE_SUPABASE_URL,
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
  {
    'house-party': {
      url: import.meta.env.VITE_SUPABASE_URL_HOUSE_PARTY,
      publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY_HOUSE_PARTY,
    },
    'bday-hunt': {
      url: import.meta.env.VITE_SUPABASE_URL_BDAY_HUNT,
      publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY_BDAY_HUNT,
    },
  },
)

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
