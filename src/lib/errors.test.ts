import { describe, expect, it } from 'vitest'
import { errorMessage } from './errors'

describe('errorMessage', () => {
  it('reads Error and Supabase-style object messages', () => {
    expect(errorMessage(new Error('Network failed'), 'Fallback')).toBe('Network failed')
    expect(errorMessage({ message: 'RPC unavailable', code: 'PGRST202' }, 'Fallback')).toBe('RPC unavailable')
  })

  it('uses the fallback for missing or empty messages', () => {
    expect(errorMessage({ message: '  ' }, 'Fallback')).toBe('Fallback')
    expect(errorMessage(null, 'Fallback')).toBe('Fallback')
  })
})
