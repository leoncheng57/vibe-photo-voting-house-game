import { describe, expect, it } from 'vitest'
import { getAppBaseUrl, getAppIdFromPathname, getThemeSurfaceFromPathname } from './active-app'

describe('getAppIdFromPathname', () => {
  it('reads the app from its own route', () => {
    expect(getAppIdFromPathname('/house-party/')).toBe('house-party')
    expect(getAppIdFromPathname('/bday-hunt/')).toBe('bday-hunt')
  })

  it('reads the app from a route served under a GitHub Pages base path', () => {
    expect(getAppIdFromPathname('/vibe-photo-voting-house-game/bday-hunt/')).toBe('bday-hunt')
  })

  it('falls back to the original app everywhere else', () => {
    expect(getAppIdFromPathname('/')).toBe('house-party')
    expect(getAppIdFromPathname('/developer/system/')).toBe('house-party')
  })

  it('keeps the legacy play route on the app that used to own it', () => {
    expect(getAppIdFromPathname('/play/')).toBe('house-party')
  })
})

describe('getAppBaseUrl', () => {
  it('joins the site base path and the app slug', () => {
    expect(getAppBaseUrl('bday-hunt', '/')).toBe('/bday-hunt/')
    expect(getAppBaseUrl('house-party', '/vibe-photo-voting-house-game/'))
      .toBe('/vibe-photo-voting-house-game/house-party/')
  })
})

describe('getThemeSurfaceFromPathname', () => {
  it('gives each app its own surface', () => {
    expect(getThemeSurfaceFromPathname('/house-party/')).toBe('house-party')
    expect(getThemeSurfaceFromPathname('/vibe-photo-voting-house-game/bday-hunt/')).toBe('bday-hunt')
  })

  it('treats the front page, developer pages and legacy redirects as shared', () => {
    expect(getThemeSurfaceFromPathname('/')).toBe('shared')
    expect(getThemeSurfaceFromPathname('/developer/palette/')).toBe('shared')
    expect(getThemeSurfaceFromPathname('/play/')).toBe('shared')
  })
})
