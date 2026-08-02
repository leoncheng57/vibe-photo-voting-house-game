import { describe, expect, it } from 'vitest'
import { getViewFromSearch, getViewUrl } from './view-navigation'

describe('view navigation', () => {
  it('parses every canonical application view', () => {
    expect(getViewFromSearch('')).toBe('challenges')
    expect(getViewFromSearch('?tutorial')).toBe('tutorial')
    expect(getViewFromSearch('?vote')).toBe('vote')
    expect(getViewFromSearch('?display')).toBe('display')
  })

  it('falls back safely and resolves conflicting flags deterministically', () => {
    expect(getViewFromSearch('?unknown')).toBe('challenges')
    expect(getViewFromSearch('?vote&tutorial')).toBe('tutorial')
    expect(getViewFromSearch('?vote&tutorial&display')).toBe('display')
  })

  it('builds canonical URLs while preserving unrelated parameters and hashes', () => {
    expect(getViewUrl('/play/', '?tutorial&invite=abc', '#photos', 'vote'))
      .toBe('/play/?vote&invite=abc#photos')
    expect(getViewUrl('/play/', '?display&vote&invite=abc', '#photos', 'challenges'))
      .toBe('/play/?invite=abc#photos')
  })

  it('canonicalizes conflicting direct links to the selected view', () => {
    const search = '?vote&tutorial&display'
    const view = getViewFromSearch(search)
    expect(getViewUrl('/play/', search, '', view)).toBe('/play/?display')
  })
})
