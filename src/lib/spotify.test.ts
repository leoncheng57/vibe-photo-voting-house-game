import { describe, expect, it } from 'vitest'
import { isSpotifyTokenFresh } from './spotify'

describe('Spotify token timing', () => {
  it('treats tokens inside the refresh buffer as expired', () => {
    const now = 1_000_000
    expect(isSpotifyTokenFresh(now + 60_000, now)).toBe(false)
    expect(isSpotifyTokenFresh(now + 59_999, now)).toBe(false)
  })

  it('reuses tokens with more than one minute remaining', () => {
    const now = 1_000_000
    expect(isSpotifyTokenFresh(now + 60_001, now)).toBe(true)
  })
})
