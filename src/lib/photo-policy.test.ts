import { describe, expect, it } from 'vitest'
import {
  ARCHIVE_PRESERVE_LIMIT,
  archiveStatusLabel,
  chooseArchiveAction,
  classifyOriginal,
  exportEntryName,
  exportFolderName,
  fitScale,
  formatBytes,
  sanitizeExportName,
  scaledDimensions,
  summarizeStorage,
} from './photo-policy'

describe('classifyOriginal', () => {
  it('recognizes preservable MIME types', () => {
    expect(classifyOriginal('IMG_0001.HEIC', 'image/heic')).toEqual({ mime: 'image/heic', extension: 'heic', preservable: true })
    expect(classifyOriginal('photo.jpeg', 'image/jpeg')).toEqual({ mime: 'image/jpeg', extension: 'jpg', preservable: true })
  })

  it('falls back to the file extension when the MIME type is missing', () => {
    expect(classifyOriginal('IMG_0002.heic', '')).toEqual({ mime: 'image/heic', extension: 'heic', preservable: true })
    expect(classifyOriginal('shot.JPEG', '')).toEqual({ mime: 'image/jpeg', extension: 'jpg', preservable: true })
  })

  it('marks other formats as non-preservable', () => {
    expect(classifyOriginal('image.png', 'image/png').preservable).toBe(false)
    expect(classifyOriginal('mystery', '').preservable).toBe(false)
  })
})

describe('chooseArchiveAction', () => {
  it('preserves small HEIC/JPEG captures exactly', () => {
    expect(chooseArchiveAction(ARCHIVE_PRESERVE_LIMIT, true)).toBe('preserve')
    expect(chooseArchiveAction(1024, true)).toBe('preserve')
  })

  it('optimizes anything above the preserve limit', () => {
    expect(chooseArchiveAction(ARCHIVE_PRESERVE_LIMIT + 1, true)).toBe('optimize')
  })

  it('optimizes non-preservable formats regardless of size', () => {
    expect(chooseArchiveAction(1024, false)).toBe('optimize')
  })
})

describe('fitScale and scaledDimensions', () => {
  it('never upscales', () => {
    expect(fitScale(1200, 900, 2400)).toBe(1)
  })

  it('fits the longest side', () => {
    expect(fitScale(4800, 3600, 2400)).toBe(0.5)
    expect(scaledDimensions(4800, 3600, 0.5)).toEqual({ width: 2400, height: 1800 })
  })

  it('keeps at least one pixel', () => {
    expect(scaledDimensions(3, 1, 0.1)).toEqual({ width: 1, height: 1 })
  })
})

describe('formatBytes', () => {
  it('formats common magnitudes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2_048)).toBe('2 KB')
    expect(formatBytes(6_400_000)).toBe('6 MB')
    expect(formatBytes(1_250_000_000)).toBe('1.25 GB')
  })

  it('handles invalid input safely', () => {
    expect(formatBytes(-5)).toBe('0 MB')
    expect(formatBytes(Number.NaN)).toBe('0 MB')
  })
})

describe('export naming', () => {
  it('sanitizes display names', () => {
    expect(sanitizeExportName('Zoë & the Café!')).toBe('zoe-the-cafe')
    expect(sanitizeExportName('   ')).toBe('guest')
  })

  it('builds ordered entry names', () => {
    expect(exportEntryName(0, 'Alex Kim', 'heic')).toBe('01-alex-kim.heic')
    expect(exportEntryName(11, 'Máté', 'jpg')).toBe('12-mate.jpg')
  })

  it('builds challenge folder names', () => {
    expect(exportFolderName(1, 'dog-date')).toBe('01-dog-date')
    expect(exportFolderName(6, 'candid')).toBe('06-candid')
  })

  it('labels archive statuses, leaving exact copies unbadged', () => {
    expect(archiveStatusLabel('exact')).toBeNull()
    expect(archiveStatusLabel('optimized')).toBe('full res · re-encoded')
    expect(archiveStatusLabel('resized')).toBe('resolution reduced')
    expect(archiveStatusLabel('legacy')).toBe('legacy game copy')
  })
})

describe('summarizeStorage', () => {
  const buckets = (photoBytes: number, originalBytes: number) => [
    { bucketId: 'photos', totalBytes: photoBytes, objectCount: 10 },
    { bucketId: 'photo-originals', totalBytes: originalBytes, objectCount: 10 },
  ]

  it('sums buckets against the quota', () => {
    const summary = summarizeStorage(buckets(100_000_000, 200_000_000), 1_000_000_000)
    expect(summary.usedBytes).toBe(300_000_000)
    expect(summary.remainingBytes).toBe(700_000_000)
    expect(summary.percent).toBe(30)
    expect(summary.level).toBe('ok')
  })

  it('warns at 75 percent and turns critical at 90 percent', () => {
    expect(summarizeStorage(buckets(500_000_000, 250_000_000), 1_000_000_000).level).toBe('warn')
    expect(summarizeStorage(buckets(500_000_000, 400_000_000), 1_000_000_000).level).toBe('critical')
  })

  it('caps the display percent at 100', () => {
    const summary = summarizeStorage(buckets(900_000_000, 400_000_000), 1_000_000_000)
    expect(summary.percent).toBe(100)
    expect(summary.remainingBytes).toBe(0)
  })
})
