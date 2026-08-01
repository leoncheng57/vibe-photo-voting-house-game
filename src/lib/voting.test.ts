import { describe, expect, it } from 'vitest'
import { canSubmitVotes, getVoteLimit } from './voting'

describe('voting policy', () => {
  it('caps ballots at three available submissions', () => {
    expect(getVoteLimit(0)).toBe(0)
    expect(getVoteLimit(2)).toBe(2)
    expect(getVoteLimit(8)).toBe(3)
  })

  it('allows any non-empty ballot up to the limit', () => {
    expect(canSubmitVotes(0, 4)).toBe(false)
    expect(canSubmitVotes(1, 4)).toBe(true)
    expect(canSubmitVotes(2, 4)).toBe(true)
    expect(canSubmitVotes(3, 4)).toBe(true)
    expect(canSubmitVotes(4, 4)).toBe(false)
  })
})
