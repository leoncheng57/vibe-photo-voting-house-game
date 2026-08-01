// Pure photo-pipeline policy: size thresholds, quality ladders, and storage
// meter math. Everything here is deterministic and covered by unit tests;
// canvas work lives in images.ts.

export const ARCHIVE_PRESERVE_LIMIT = 6 * 1024 * 1024
export const ARCHIVE_HARD_LIMIT = 25 * 1024 * 1024
export const GAME_MAX_DIMENSION = 2400
export const GAME_TARGET_BYTES = 1.5 * 1024 * 1024
export const GAME_HARD_LIMIT = Math.floor(4.75 * 1024 * 1024)
export const STORAGE_QUOTA_BYTES = 1_000_000_000

export const ARCHIVE_QUALITY_STEPS = [0.9, 0.85, 0.8, 0.75] as const
export const ARCHIVE_SCALE_STEPS = [0.85, 0.7, 0.55, 0.4] as const
export const ARCHIVE_SCALE_QUALITY = 0.8

export const GAME_QUALITY_STEPS = [0.8, 0.72, 0.64] as const
export const GAME_SCALE_STEPS = [0.82, 0.66, 0.5] as const
export const GAME_SCALE_QUALITY = 0.7

const PRESERVABLE_MIMES = new Set(['image/jpeg', 'image/heic', 'image/heif'])
const PRESERVABLE_EXTENSIONS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  heic: 'image/heic',
  heif: 'image/heif',
}

export type ArchiveAction = 'preserve' | 'optimize'

export interface OriginalKind {
  mime: string | null
  extension: string | null
  preservable: boolean
}

/** Identify HEIC/HEIF/JPEG inputs by MIME type, falling back to extension. */
export function classifyOriginal(fileName: string, fileType: string): OriginalKind {
  const type = fileType.toLowerCase()
  if (PRESERVABLE_MIMES.has(type)) {
    const extension = type === 'image/jpeg' ? 'jpg' : type.slice('image/'.length)
    return { mime: type, extension, preservable: true }
  }

  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim())
  const extension = match ? match[1].toLowerCase() : null
  if (extension && PRESERVABLE_EXTENSIONS[extension]) {
    return {
      mime: PRESERVABLE_EXTENSIONS[extension],
      extension: extension === 'jpeg' ? 'jpg' : extension,
      preservable: true,
    }
  }
  return { mime: type || null, extension, preservable: false }
}

/**
 * Preserve exact bytes when the capture is a reasonably sized HEIC/JPEG;
 * everything else is re-encoded to a JPEG archive below the preserve limit.
 */
export function chooseArchiveAction(bytes: number, preservable: boolean): ArchiveAction {
  return preservable && bytes <= ARCHIVE_PRESERVE_LIMIT ? 'preserve' : 'optimize'
}

/** Downscale factor (never above 1) fitting the longest side to maxDimension. */
export function fitScale(width: number, height: number, maxDimension: number): number {
  const longest = Math.max(width, height)
  if (longest <= 0) return 1
  return Math.min(1, maxDimension / longest)
}

export function scaledDimensions(width: number, height: number, scale: number) {
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 MB'
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`
  if (bytes >= 1_000_000) return `${Math.round(bytes / 1_000_000)} MB`
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`
  return `${Math.round(bytes)} B`
}

/** Safe, portable ZIP entry name fragment from a display name. */
export function sanitizeExportName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 _-]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
  return cleaned || 'guest'
}

export function exportEntryName(index: number, ownerName: string, extension: string): string {
  const ordinal = String(index + 1).padStart(2, '0')
  return `${ordinal}-${sanitizeExportName(ownerName)}.${extension}`
}

/** ZIP folder for one challenge, e.g. `01-dog-date`. */
export function exportFolderName(sortOrder: number, slug: string): string {
  return `${String(sortOrder).padStart(2, '0')}-${sanitizeExportName(slug)}`
}

export type StorageLevel = 'ok' | 'warn' | 'critical'

export interface StorageBucketUsage {
  bucketId: string
  totalBytes: number
  objectCount: number
}

export interface StorageSummary {
  usedBytes: number
  remainingBytes: number
  quotaBytes: number
  ratio: number
  percent: number
  level: StorageLevel
  buckets: StorageBucketUsage[]
}

export function summarizeStorage(
  buckets: StorageBucketUsage[],
  quotaBytes: number = STORAGE_QUOTA_BYTES,
): StorageSummary {
  const usedBytes = buckets.reduce((total, bucket) => total + Math.max(0, bucket.totalBytes), 0)
  const ratio = quotaBytes > 0 ? usedBytes / quotaBytes : 1
  const level: StorageLevel = ratio >= 0.9 ? 'critical' : ratio >= 0.75 ? 'warn' : 'ok'
  return {
    usedBytes,
    remainingBytes: Math.max(0, quotaBytes - usedBytes),
    quotaBytes,
    ratio,
    percent: Math.min(100, Math.round(ratio * 100)),
    level,
    buckets,
  }
}
