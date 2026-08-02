import { describe, expect, it } from 'vitest'
import {
  defaultSpotifyPlayerLayout,
  normalizeSpotifyPlayerLayout,
  parseSpotifyPlayerLayout,
} from './spotify-layout'

describe('Spotify player layout', () => {
  it('uses stable defaults for missing or malformed storage', () => {
    expect(parseSpotifyPlayerLayout(null)).toEqual(defaultSpotifyPlayerLayout)
    expect(parseSpotifyPlayerLayout('{bad json')).toEqual(defaultSpotifyPlayerLayout)
  })

  it('restores a valid persisted corner and size', () => {
    expect(parseSpotifyPlayerLayout('{"corner":"left","width":440,"height":210}')).toEqual({
      corner: 'left',
      height: 210,
      width: 440,
    })
  })

  it('clamps the player to its limits and the viewport', () => {
    expect(normalizeSpotifyPlayerLayout({ corner: 'right', width: 999, height: 999 }, 480, 360)).toEqual({
      corner: 'right',
      height: 230,
      width: 448,
    })
    expect(normalizeSpotifyPlayerLayout({ corner: 'unknown' as 'left', width: 10, height: 10 }, 1920, 1080)).toEqual({
      corner: 'right',
      height: 132,
      width: 300,
    })
  })
})
