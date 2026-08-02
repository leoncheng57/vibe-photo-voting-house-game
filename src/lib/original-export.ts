import type { OriginalCleanupStatus, OriginalRecord } from '../types'
import { exportEntryName, exportFolderName } from './photo-policy'

export interface PlannedOriginalFile {
  record: OriginalRecord
  fileName: string
}

export interface PlannedOriginalFolder {
  challengeId: number
  folderName: string
  title: string
  files: PlannedOriginalFile[]
  totalBytes: number
  processedCount: number
}

export interface OriginalExportSession {
  versionIds: string[]
  cleanupSql: string
  totalFiles: number
  totalBytes: number
  archiveBytes: number
}

export function summarizeOriginalCleanup(status: OriginalCleanupStatus[], expectedCount: number) {
  const completeSet = status.length === expectedCount
  return {
    allApproved: completeSet && status.every((row) => row.approved),
    remainingObjects: completeSet ? status.filter((row) => row.objectExists).length : expectedCount,
    deletionRecorded: completeSet && status.every((row) => row.deletionRecorded),
  }
}

function pathExtension(path: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(path)
  return match ? match[1].toLowerCase() : 'jpg'
}

export function planOriginalArchive(records: OriginalRecord[]): PlannedOriginalFolder[] {
  const folders = new Map<number, PlannedOriginalFolder>()
  const sorted = [...records].sort(
    (a, b) => a.challengeSortOrder - b.challengeSortOrder
      || a.ownerName.localeCompare(b.ownerName)
      || a.createdAt.localeCompare(b.createdAt)
      || a.versionId.localeCompare(b.versionId),
  )

  for (const record of sorted) {
    let folder = folders.get(record.challengeId)
    if (!folder) {
      folder = {
        challengeId: record.challengeId,
        folderName: exportFolderName(record.challengeSortOrder, record.challengeSlug),
        title: record.challengeTitle,
        files: [],
        totalBytes: 0,
        processedCount: 0,
      }
      folders.set(record.challengeId, folder)
    }
    folder.files.push({
      record,
      fileName: exportEntryName(folder.files.length, record.ownerName, pathExtension(record.originalPath)),
    })
    folder.totalBytes += record.originalBytes
    if (record.originalStatus !== 'exact') folder.processedCount += 1
  }

  return [...folders.values()]
}

export function originalVersionLabel(record: OriginalRecord) {
  if (record.versionState === 'pending') return 'recovery copy'
  return record.isCurrent ? 'current' : 'superseded'
}

export function buildOriginalCleanupSql(versionIds: string[]) {
  if (!versionIds.length || versionIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
    throw new Error('Cleanup requires valid exported version IDs.')
  }
  const versionArray = versionIds.map((id) => `'${id}'`).join(', ')
  return `-- Generated for this exact exported ZIP. Review before running.
begin;

-- Lock and approve the exact exported rows before changing active pointers.
update original_versions
set cleanup_approved_at = now()
where id = any (array[${versionArray}]::uuid[])
  and deleted_at is null;

select set_config('app.original_version_mutation', 'cleanup', true);

update submissions
set original_path = null, original_filename = null,
    original_mime = null, original_bytes = null,
    original_width = null, original_height = null,
    original_status = null, original_source_bytes = null,
    original_source_mime = null
where original_path in (
  select original_path from original_versions
  where id = any (array[${versionArray}]::uuid[])
);

commit;
`
}
