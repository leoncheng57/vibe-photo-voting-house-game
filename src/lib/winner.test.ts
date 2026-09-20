import { describe, expect, it } from 'vitest'
import type { Submission } from '../types'
import {
  areVoteScoresMeaningful,
  getWinnerStrategy,
  selectWinners,
  toWinnerCandidates,
} from './winner'

const candidates = [
  { id: 'a', ownerName: 'Ada', voteCount: 4 },
  { id: 'b', ownerName: 'Bo', voteCount: 2 },
  { id: 'c', ownerName: 'Cy', voteCount: 4 },
]

describe('voting mode', () => {
  it('picks every tied top-voted entrant with its real vote count', () => {
    expect(selectWinners(candidates, 'voting')).toEqual([
      { submissionId: 'a', ownerName: 'Ada', voteCount: 4, mode: 'voting' },
      { submissionId: 'c', ownerName: 'Cy', voteCount: 4, mode: 'voting' },
    ])
  })

  it('picks nobody when no one has a vote', () => {
    expect(selectWinners([
      { id: 'a', ownerName: 'Ada', voteCount: 0 },
      { id: 'b', ownerName: 'Bo', voteCount: 0 },
    ], 'voting')).toEqual([])
  })

  it('is the default mode', () => {
    expect(getWinnerStrategy().mode).toBe('voting')
    expect(selectWinners(candidates)).toHaveLength(2)
  })
})

describe('random mode', () => {
  it('draws a single uniform entrant from the injected source', () => {
    expect(selectWinners(candidates, 'random', () => 0)).toEqual([
      { submissionId: 'a', ownerName: 'Ada', voteCount: null, mode: 'random' },
    ])
    expect(selectWinners(candidates, 'random', () => 0.5)).toMatchObject([{ submissionId: 'b' }])
    expect(selectWinners(candidates, 'random', () => 0.999)).toMatchObject([{ submissionId: 'c' }])
  })

  it('ignores vote counts entirely', () => {
    expect(selectWinners([
      { id: 'a', ownerName: 'Ada', voteCount: 0 },
      { id: 'b', ownerName: 'Bo', voteCount: 99 },
    ], 'random', () => 0)).toEqual([
      { submissionId: 'a', ownerName: 'Ada', voteCount: null, mode: 'random' },
    ])
  })

  it('stays in range for out-of-bound draws and picks nobody with no entrants', () => {
    expect(selectWinners(candidates, 'random', () => 1)).toMatchObject([{ submissionId: 'c' }])
    expect(selectWinners(candidates, 'random', () => -1)).toMatchObject([{ submissionId: 'a' }])
    expect(selectWinners([], 'random', () => 0)).toEqual([])
  })
})

describe('toWinnerCandidates', () => {
  it('maps submissions with missing owner or vote data', () => {
    const submissions = [
      { id: 'a', challenge_id: 1, user_id: 'u1', storage_path: 'p', created_at: 't', ownerName: 'Ada', voteCount: 3 },
      { id: 'b', challenge_id: 1, user_id: 'u2', storage_path: 'p', created_at: 't' },
    ] satisfies Submission[]

    expect(toWinnerCandidates(submissions)).toEqual([
      { id: 'a', ownerName: 'Ada', voteCount: 3 },
      { id: 'b', ownerName: null, voteCount: 0 },
    ])
  })
})

describe('areVoteScoresMeaningful', () => {
  it('is false only under random mode', () => {
    expect(areVoteScoresMeaningful('voting')).toBe(true)
    expect(areVoteScoresMeaningful()).toBe(true)
    expect(areVoteScoresMeaningful('random')).toBe(false)
  })
})
