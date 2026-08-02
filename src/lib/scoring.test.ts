import { describe, expect, it } from 'vitest'
import { getWinningPhotoIds, rankLeaderboardEntries, scorePhotos } from './scoring'

describe('scorePhotos', () => {
  it('ranks photos by votes', () => {
    expect(scorePhotos([
      { id: 'a', votes: 7 },
      { id: 'b', votes: 4 },
      { id: 'c', votes: 2 },
      { id: 'd', votes: 1 },
    ])).toMatchObject([
      { id: 'a', rank: 1 },
      { id: 'b', rank: 2 },
      { id: 'c', rank: 3 },
      { id: 'd', rank: 4 },
    ])
  })

  it('gives tied photos the same competition rank', () => {
    expect(scorePhotos([
      { id: 'a', votes: 5 },
      { id: 'b', votes: 5 },
      { id: 'c', votes: 3 },
    ])).toMatchObject([
      { id: 'a', rank: 1 },
      { id: 'b', rank: 1 },
      { id: 'c', rank: 3 },
    ])
  })
})

describe('getWinningPhotoIds', () => {
  it('returns every tied first-place photo', () => {
    expect(getWinningPhotoIds([
      { id: 'a', votes: 4 },
      { id: 'b', votes: 2 },
      { id: 'c', votes: 4 },
    ])).toEqual(['a', 'c'])
  })

  it('returns no winner when the challenge has no votes', () => {
    expect(getWinningPhotoIds([
      { id: 'a', votes: 0 },
      { id: 'b', votes: 0 },
    ])).toEqual([])
  })
})

describe('rankLeaderboardEntries', () => {
  it('uses competition ranks based only on total votes', () => {
    expect(rankLeaderboardEntries([
      { name: 'A', votes: 8, wins: 2 },
      { name: 'B', votes: 6, wins: 3 },
      { name: 'C', votes: 6, wins: 1 },
      { name: 'D', votes: 4, wins: 1 },
    ])).toMatchObject([
      { name: 'A', rank: 1 },
      { name: 'B', rank: 2 },
      { name: 'C', rank: 2 },
      { name: 'D', rank: 4 },
    ])
  })
})
