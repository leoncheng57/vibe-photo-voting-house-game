// Pure host-settings form logic: hex validation, change detection, the partial
// update payload, and whether the form may be submitted. The component is thin
// presentation over these helpers because the test runner has no DOM.

import type { GameSettings, ThemeTokens, WinnerMode } from '../types'
import { THEME_TOKEN_NAMES, WINNER_MODES } from '../config/settings-defaults'

export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number]

const HEX_PATTERN = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

// Accepts #abc, #aabbcc, and the bare forms; returns the canonical lowercase
// six-digit value so a shorthand edit never looks like a change on its own.
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim()
  if (!HEX_PATTERN.test(trimmed)) return null

  const digits = (trimmed.startsWith('#') ? trimmed.slice(1) : trimmed).toLowerCase()
  const expanded = digits.length === 3 ? digits.replace(/./g, (digit) => digit + digit) : digits
  return `#${expanded}`
}

export function isHexColor(value: string): boolean {
  return normalizeHexColor(value) !== null
}

export function isWinnerMode(value: string): value is WinnerMode {
  return (WINNER_MODES as readonly string[]).includes(value)
}

export function invalidThemeTokens(theme: ThemeTokens): ThemeTokenName[] {
  return THEME_TOKEN_NAMES.filter((name) => !isHexColor(theme[name]))
}

// Null when any token is unusable, so a half-typed hex can never be sent.
export function normalizeTheme(theme: ThemeTokens): ThemeTokens | null {
  const normalized = {} as ThemeTokens
  for (const name of THEME_TOKEN_NAMES) {
    const color = normalizeHexColor(theme[name])
    if (!color) return null
    normalized[name] = color
  }
  return normalized
}

export function changedThemeTokens(current: ThemeTokens, draft: ThemeTokens): ThemeTokenName[] {
  return THEME_TOKEN_NAMES.filter((name) => {
    const a = normalizeHexColor(current[name]) ?? current[name].trim().toLowerCase()
    const b = normalizeHexColor(draft[name]) ?? draft[name].trim().toLowerCase()
    return a !== b
  })
}

export function hasPendingChanges(current: GameSettings, draft: GameSettings): boolean {
  return current.winnerMode !== draft.winnerMode || changedThemeTokens(current.theme, draft.theme).length > 0
}

export interface SettingsUpdate {
  theme?: ThemeTokens
  winnerMode?: WinnerMode
}

// update_game_settings coalesces nulls, so only changed fields travel.
export function buildSettingsUpdate(current: GameSettings, draft: GameSettings): SettingsUpdate {
  const update: SettingsUpdate = {}

  if (changedThemeTokens(current.theme, draft.theme).length > 0) {
    const theme = normalizeTheme(draft.theme)
    if (theme) update.theme = theme
  }
  if (current.winnerMode !== draft.winnerMode) update.winnerMode = draft.winnerMode

  return update
}

export type SubmitBlocker = 'saving' | 'no-host-pin' | 'missing-pin' | 'invalid-color' | 'no-changes'

export interface SubmitState {
  current: GameSettings
  draft: GameSettings
  hostPin: string
  hostPinSet: boolean
  saving: boolean
}

export function submitBlocker(state: SubmitState): SubmitBlocker | null {
  if (state.saving) return 'saving'
  if (!state.hostPinSet) return 'no-host-pin'
  if (invalidThemeTokens(state.draft.theme).length > 0) return 'invalid-color'
  if (!hasPendingChanges(state.current, state.draft)) return 'no-changes'
  if (!state.hostPin.trim()) return 'missing-pin'
  return null
}

export function canSubmitSettings(state: SubmitState): boolean {
  return submitBlocker(state) === null
}

export function submitBlockerMessage(blocker: SubmitBlocker | null): string | null {
  switch (blocker) {
    case 'saving':
      return 'Saving your changes…'
    case 'no-host-pin':
      return 'No host PIN is set yet, so settings cannot be changed from here.'
    case 'invalid-color':
      return 'Every color needs a hex value like #bb81b5.'
    case 'no-changes':
      return 'Nothing has changed yet.'
    case 'missing-pin':
      return 'Enter the host PIN to save.'
    default:
      return null
  }
}

// Human labels for the palette editor; keeping them beside the token list makes
// a missing entry a type error rather than a blank row.
export const THEME_TOKEN_LABELS: Record<ThemeTokenName, string> = {
  ink: 'Ink (deep text)',
  sky: 'Sky (primary accent)',
  pool: 'Pool (mid tone)',
  powder: 'Powder (soft fill)',
  ice: 'Ice (pale fill)',
  paper: 'Paper (page background)',
  alert: 'Alert (warnings)',
  accentBlue: 'Accent blue',
  accentGreen: 'Accent green',
}

export const WINNER_MODE_LABELS: Record<WinnerMode, string> = {
  voting: 'Most votes wins',
  random: 'Random draw',
}

export const WINNER_MODE_HINTS: Record<WinnerMode, string> = {
  voting: 'The photo with the most votes takes each challenge.',
  random: 'A uniform draw over everyone who entered the challenge.',
}
