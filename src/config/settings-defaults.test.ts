import { describe, expect, it } from 'vitest'
import { BDAY_HUNT_THEME, DEFAULT_THEME, HOUSE_PARTY_THEME, SHARED_THEME, SURFACE_THEMES, THEME_TOKEN_NAMES } from './settings-defaults'

const channels = (hex: string) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))

describe('surface themes', () => {
  it('keeps house-party on the original blue and bday-hunt on the springtime purple', () => {
    expect(SURFACE_THEMES['house-party'].ink).toBe('#10233d')
    expect(SURFACE_THEMES['bday-hunt'].ink).toBe('#2f1b2b')
  })

  it('defines every token in every palette', () => {
    for (const theme of [HOUSE_PARTY_THEME, BDAY_HUNT_THEME, SHARED_THEME]) {
      for (const token of THEME_TOKEN_NAMES) expect(theme[token]).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('keeps the shared palette strictly grey', () => {
    for (const token of THEME_TOKEN_NAMES) {
      const [red, green, blue] = channels(SHARED_THEME[token])
      expect(red).toBe(green)
      expect(green).toBe(blue)
    }
  })

  it('falls back to the shared palette outside a browser', () => {
    expect(DEFAULT_THEME).toBe(SHARED_THEME)
  })
})
