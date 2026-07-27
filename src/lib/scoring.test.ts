import { describe, expect, it } from 'vitest'
import { scorePhotos } from './scoring'

describe('scorePhotos', () => {
  it('awards 3-2-1 points', () => {
    expect(scorePhotos([
      { id: 'a', votes: 7 },
      { id: 'b', votes: 4 },
      { id: 'c', votes: 2 },
      { id: 'd', votes: 1 },
    ])).toMatchObject([
      { id: 'a', rank: 1, points: 3 },
      { id: 'b', rank: 2, points: 2 },
      { id: 'c', rank: 3, points: 1 },
      { id: 'd', rank: 4, points: 0 },
    ])
  })

  it('gives tied photos the same rank points', () => {
    expect(scorePhotos([
      { id: 'a', votes: 5 },
      { id: 'b', votes: 5 },
      { id: 'c', votes: 3 },
    ])).toMatchObject([
      { id: 'a', rank: 1, points: 3 },
      { id: 'b', rank: 1, points: 3 },
      { id: 'c', rank: 3, points: 1 },
    ])
  })

  it('does not award points for zero votes', () => {
    expect(scorePhotos([{ id: 'a', votes: 0 }])[0].points).toBe(0)
  })
})
