import { describe, expect, it } from 'vitest'
import type { Submission } from '../types'
import {
  areVoteScoresMeaningful,
  countRandomDrawWins,
  drawGrandWinner,
  drawRandomWinners,
  getGrandDrawSeed,
  getRandomDrawSeed,
  getWinnerStrategy,
  seededRandom,
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

describe('seeded random draw', () => {
  const entrants = [{ id: 'c' }, { id: 'a' }, { id: 'b' }, { id: 'd' }]

  it('gives the same winner for the same challenge and entries in any order', () => {
    const first = drawRandomWinners(4, entrants)
    const reordered = drawRandomWinners(4, [...entrants].reverse())
    expect(first).toHaveLength(1)
    expect(reordered).toEqual(first)
  })

  it('keeps every draw inside [0, 1)', () => {
    const random = seededRandom('any seed')
    for (let index = 0; index < 1000; index += 1) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('spreads wins across entrants rather than favouring one position', () => {
    const counts = new Map<string, number>()
    for (let challengeId = 1; challengeId <= 400; challengeId += 1) {
      const [pick] = drawRandomWinners(challengeId, entrants)
      counts.set(pick.submissionId, (counts.get(pick.submissionId) ?? 0) + 1)
    }
    for (const entrant of entrants) expect(counts.get(entrant.id) ?? 0).toBeGreaterThan(60)
  })

  it('keys the seed on the sorted entry set', () => {
    expect(getRandomDrawSeed(2, ['b', 'a'])).toBe('2:a,b')
  })
})

describe('countRandomDrawWins', () => {
  it('credits each challenge draw to the owner of the drawn entry', () => {
    const entries = [
      { id: 's1', challenge_id: 1, user_id: 'ana' },
      { id: 's2', challenge_id: 1, user_id: 'ben' },
      { id: 's3', challenge_id: 2, user_id: 'ana' },
    ]
    const wins = countRandomDrawWins(entries)
    const [challengeOnePick] = drawRandomWinners(1, [{ id: 's1' }, { id: 's2' }])
    const challengeOneOwner = challengeOnePick.submissionId === 's1' ? 'ana' : 'ben'
    expect([...wins.values()].reduce((sum, value) => sum + value, 0)).toBe(2)
    expect(wins.get('ana')).toBe(challengeOneOwner === 'ana' ? 2 : 1)
  })

  it('credits nobody when there are no entries', () => {
    expect(countRandomDrawWins([]).size).toBe(0)
  })
})

describe('grand draw', () => {
  const entries = [{ id: 'p3' }, { id: 'p1' }, { id: 'p2' }, { id: 'p4' }]

  it('picks exactly one entry from all of them', () => {
    const picks = drawGrandWinner(entries)
    expect(picks).toHaveLength(1)
    expect(entries.map((entry) => entry.id)).toContain(picks[0].submissionId)
    expect(picks[0]).toMatchObject({ voteCount: null, mode: 'random' })
  })

  it('gives the same winner whatever order the entries arrive in', () => {
    expect(drawGrandWinner([...entries].reverse())).toEqual(drawGrandWinner(entries))
  })

  it('is seeded apart from any single challenge draw', () => {
    expect(getGrandDrawSeed(['b', 'a'])).toBe('grand:a,b')
    expect(getGrandDrawSeed(['a'])).not.toBe(getRandomDrawSeed(1, ['a']))
  })

  it('picks nobody when nobody has entered', () => {
    expect(drawGrandWinner([])).toEqual([])
  })
})
