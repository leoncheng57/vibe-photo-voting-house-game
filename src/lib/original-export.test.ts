import { describe, expect, it } from 'vitest'
import type { OriginalRecord } from '../types'
import { buildOriginalCleanupSql, originalVersionLabel, planOriginalArchive } from './original-export'

function record(overrides: Partial<OriginalRecord>): OriginalRecord {
  return {
    versionId: 'version-a',
    submissionId: 'submission-a',
    challengeId: 1,
    challengeSlug: 'dog-date',
    challengeTitle: 'The Dog Date',
    challengeSortOrder: 1,
    userId: 'user-a',
    ownerName: 'Alex Kim',
    originalPath: '1/user-a/version-a.heic',
    originalFilename: 'IMG_0001.HEIC',
    originalMime: 'image/heic',
    originalBytes: 1_000,
    originalWidth: 4032,
    originalHeight: 3024,
    originalStatus: 'exact',
    originalSourceBytes: 1_000,
    originalSourceMime: 'image/heic',
    versionState: 'ready',
    isCurrent: true,
    createdAt: '2026-08-01T10:00:00Z',
    ...overrides,
  }
}

describe('original archive planning', () => {
  it('keeps multiple revisions for one guest with deterministic unique names', () => {
    const folders = planOriginalArchive([
      record({ versionId: 'version-b', originalPath: '1/user-a/version-b.jpg', createdAt: '2026-08-01T11:00:00Z', isCurrent: true }),
      record({ versionId: 'version-a', isCurrent: false }),
    ])

    expect(folders).toHaveLength(1)
    expect(folders[0].files.map((file) => file.fileName)).toEqual([
      '01-alex-kim.heic',
      '02-alex-kim.jpg',
    ])
    expect(folders[0].totalBytes).toBe(2_000)
  })

  it('labels current, superseded, and stored pending versions', () => {
    expect(originalVersionLabel(record({ isCurrent: true }))).toBe('current')
    expect(originalVersionLabel(record({ isCurrent: false }))).toBe('superseded')
    expect(originalVersionLabel(record({ versionState: 'pending', isCurrent: false }))).toBe('recovery copy')
  })

  it('builds cleanup SQL for only the exact exported versions and approves first', () => {
    const first = '11111111-1111-4111-8111-111111111111'
    const second = '22222222-2222-4222-8222-222222222222'
    const sql = buildOriginalCleanupSql([first, second])

    expect(sql).toContain(`array['${first}', '${second}']::uuid[]`)
    expect(sql.indexOf('update original_versions')).toBeLessThan(sql.indexOf('update submissions'))
    expect(() => buildOriginalCleanupSql(['not-a-version'])).toThrow()
  })
})
