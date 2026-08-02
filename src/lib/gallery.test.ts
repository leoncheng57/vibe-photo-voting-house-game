import { describe, expect, it } from 'vitest'
import { sortGallerySubmissions } from './gallery'
import type { Submission } from '../types'

function submission(id: string, createdAt: string): Submission {
  return {
    id,
    challenge_id: 1,
    user_id: 'user',
    storage_path: `${id}.jpg`,
    created_at: createdAt,
  }
}

describe('sortGallerySubmissions', () => {
  it('shows the newest submissions first without mutating the source', () => {
    const source = [
      submission('older', '2026-08-01T10:00:00Z'),
      submission('newest', '2026-08-01T12:00:00Z'),
      submission('middle', '2026-08-01T11:00:00Z'),
    ]

    expect(sortGallerySubmissions(source).map((item) => item.id)).toEqual(['newest', 'middle', 'older'])
    expect(source.map((item) => item.id)).toEqual(['older', 'newest', 'middle'])
  })

  it('uses the submission id as a deterministic timestamp tie-breaker', () => {
    const createdAt = '2026-08-01T12:00:00Z'
    expect(sortGallerySubmissions([
      submission('b', createdAt),
      submission('a', createdAt),
    ]).map((item) => item.id)).toEqual(['a', 'b'])
  })
})
