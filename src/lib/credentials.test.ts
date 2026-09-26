import { describe, expect, it } from 'vitest'
import { resolveCredentials } from './credentials'

const shared = { url: 'https://shared.supabase.co', publishableKey: 'sb_publishable_shared' }
const house = { url: 'https://house.supabase.co', publishableKey: 'sb_publishable_house' }
const none = { url: undefined, publishableKey: undefined }

describe('resolveCredentials', () => {
  it('gives pages outside any app the shared pair', () => {
    expect(resolveCredentials('shared', shared, { 'house-party': house, 'bday-hunt': none })).toBe(shared)
  })

  it('lets an open app fall back to the shared pair', () => {
    expect(resolveCredentials('bday-hunt', shared, { 'house-party': none, 'bday-hunt': none })).toBe(shared)
  })

  it('never lets a closed app fall back to the shared pair', () => {
    expect(resolveCredentials('house-party', shared, { 'house-party': none, 'bday-hunt': none })).toEqual({})
  })

  it('ignores a half-set pair on a closed app', () => {
    expect(resolveCredentials('house-party', shared, { 'house-party': { url: house.url }, 'bday-hunt': none })).toEqual({})
  })

  it('uses an app’s own pair when both halves are set, open or closed', () => {
    expect(resolveCredentials('house-party', shared, { 'house-party': house, 'bday-hunt': none })).toBe(house)
  })
})
