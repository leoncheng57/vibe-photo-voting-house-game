import { APPS, type AppId } from '../config/apps'
import type { ThemeSurface } from './active-app'

export type SupabaseCredentials = { url?: string; publishableKey?: string }

// An open app falls back to the shared pair, which lets it run against the one
// project the deploy is configured with. A closed app never does: without its
// own pair it gets no backend, so its page cannot join or write to another
// app's party. Pages that belong to no app (developer references such as the
// photo export) use the shared pair directly.
export function resolveCredentials(
  surface: ThemeSurface,
  shared: SupabaseCredentials,
  perApp: Record<AppId, SupabaseCredentials>,
): SupabaseCredentials {
  if (surface === 'shared') return shared
  const own = perApp[surface]
  if (own.url && own.publishableKey) return own
  return APPS[surface].open ? shared : {}
}
