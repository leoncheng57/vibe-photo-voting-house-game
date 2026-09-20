import { describe, expect, it } from 'vitest'
import {
  buildSettingsUpdate,
  canSubmitSettings,
  changedThemeTokens,
  hasPendingChanges,
  invalidThemeTokens,
  isHexColor,
  isWinnerMode,
  normalizeHexColor,
  normalizeTheme,
  submitBlocker,
  submitBlockerMessage,
  THEME_TOKEN_LABELS,
  WINNER_MODE_LABELS,
} from './settings'
import { DEFAULT_GAME_SETTINGS, DEFAULT_THEME, THEME_TOKEN_NAMES, WINNER_MODES } from '../config/settings-defaults'
import type { GameSettings, ThemeTokens } from '../types'

function theme(overrides: Partial<ThemeTokens> = {}): ThemeTokens {
  return { ...DEFAULT_THEME, ...overrides }
}

function settings(overrides: Partial<GameSettings> = {}): GameSettings {
  return { ...DEFAULT_GAME_SETTINGS, theme: theme(), ...overrides }
}

describe('hex color normalization', () => {
  it('canonicalizes shorthand, bare, and uppercase forms', () => {
    expect(normalizeHexColor('#ABC')).toBe('#aabbcc')
    expect(normalizeHexColor('a78BFA')).toBe('#a78bfa')
    expect(normalizeHexColor('  #A78BFA  ')).toBe('#a78bfa')
  })

  it('rejects anything that is not a three or six digit hex', () => {
    expect(normalizeHexColor('')).toBeNull()
    expect(normalizeHexColor('#ab')).toBeNull()
    expect(normalizeHexColor('#abcde')).toBeNull()
    expect(normalizeHexColor('#abcdefg')).toBeNull()
    expect(normalizeHexColor('rebeccapurple')).toBeNull()
    expect(normalizeHexColor('rgb(1,2,3)')).toBeNull()
    expect(isHexColor('#zzzzzz')).toBe(false)
    expect(isHexColor('#86efac')).toBe(true)
  })
})

describe('theme validation', () => {
  it('reports every unusable token by name', () => {
    expect(invalidThemeTokens(theme())).toEqual([])
    expect(invalidThemeTokens(theme({ ink: '', accentGreen: 'green' }))).toEqual(['ink', 'accentGreen'])
  })

  it('normalizes a whole theme or refuses it outright', () => {
    const normalized = normalizeTheme(theme({ ink: '#ABC' }))
    expect(normalized?.ink).toBe('#aabbcc')
    expect(normalized?.paper).toBe(DEFAULT_THEME.paper)
    expect(normalizeTheme(theme({ sky: '#12' }))).toBeNull()
  })

  it('covers every contract token with a label', () => {
    for (const name of THEME_TOKEN_NAMES) expect(THEME_TOKEN_LABELS[name]).toBeTruthy()
    for (const mode of WINNER_MODES) expect(WINNER_MODE_LABELS[mode]).toBeTruthy()
  })
})

describe('winner mode guard', () => {
  it('accepts only the contract modes', () => {
    expect(isWinnerMode('voting')).toBe(true)
    expect(isWinnerMode('random')).toBe(true)
    expect(isWinnerMode('coin-flip')).toBe(false)
  })
})

describe('change detection', () => {
  it('ignores case and shorthand differences that mean the same color', () => {
    expect(changedThemeTokens(theme(), theme({ ink: DEFAULT_THEME.ink.toUpperCase() }))).toEqual([])
    expect(changedThemeTokens(theme(), theme({ ink: '#000000' }))).toEqual(['ink'])
  })

  it('sees winner mode changes as pending work', () => {
    expect(hasPendingChanges(settings(), settings())).toBe(false)
    expect(hasPendingChanges(settings(), settings({ winnerMode: 'random' }))).toBe(true)
    expect(hasPendingChanges(settings(), settings({ theme: theme({ pool: '#111111' }) }))).toBe(true)
  })
})

describe('update payload', () => {
  it('is empty when nothing changed', () => {
    expect(buildSettingsUpdate(settings(), settings())).toEqual({})
  })

  it('sends only the fields that changed', () => {
    expect(buildSettingsUpdate(settings(), settings({ winnerMode: 'random' }))).toEqual({ winnerMode: 'random' })

    const update = buildSettingsUpdate(settings(), settings({ theme: theme({ ink: '#ABC' }) }))
    expect(update.winnerMode).toBeUndefined()
    expect(update.theme).toEqual(theme({ ink: '#aabbcc' }))
  })

  it('never sends a theme containing an unusable color', () => {
    const update = buildSettingsUpdate(settings(), settings({ theme: theme({ ink: '#zz' }), winnerMode: 'random' }))
    expect(update.theme).toBeUndefined()
    expect(update.winnerMode).toBe('random')
  })
})

describe('submittability', () => {
  const base = {
    current: settings(),
    draft: settings({ winnerMode: 'random' as const }),
    hostPin: '4821',
    hostPinSet: true,
    saving: false,
  }

  it('allows a changed form with a PIN', () => {
    expect(submitBlocker(base)).toBeNull()
    expect(canSubmitSettings(base)).toBe(true)
  })

  it('blocks while saving, without a PIN, and with nothing to save', () => {
    expect(submitBlocker({ ...base, saving: true })).toBe('saving')
    expect(submitBlocker({ ...base, hostPin: '   ' })).toBe('missing-pin')
    expect(submitBlocker({ ...base, draft: base.current })).toBe('no-changes')
  })

  it('blocks when no host PIN exists, ahead of every other reason', () => {
    expect(submitBlocker({ ...base, hostPinSet: false, hostPin: '' })).toBe('no-host-pin')
  })

  it('blocks on an unusable color even when the winner mode alone would be savable', () => {
    const draft = settings({ theme: theme({ sky: '#nope' }), winnerMode: 'random' })
    expect(submitBlocker({ ...base, draft })).toBe('invalid-color')
  })

  it('explains every blocker and says nothing when clear', () => {
    expect(submitBlockerMessage(null)).toBeNull()
    for (const blocker of ['saving', 'no-host-pin', 'missing-pin', 'invalid-color', 'no-changes'] as const) {
      expect(submitBlockerMessage(blocker)).toBeTruthy()
    }
  })
})
