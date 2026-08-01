import { useEffect, useMemo, useRef, useState } from 'react'
import { downloadOriginal, getAllOriginals, getPartyStatus } from '../lib/api'
import { exportEntryName, exportFolderName, formatBytes } from '../lib/photo-policy'
import { zipBlob, type ZipEntry } from '../lib/zip'
import { isSupabaseConfigured } from '../lib/supabase'
import { useStorageUsage } from '../lib/useStorageUsage'
import type { OriginalRecord } from '../types'
import { StorageMeter } from './StorageMeter'

type Status = 'loading' | 'unconfigured' | 'not-member' | 'ready'

interface Progress {
  done: number
  total: number
}

interface PlannedFile {
  record: OriginalRecord
  /** Entry name inside the challenge folder, e.g. `03-alex.heic`. */
  fileName: string
}

interface PlannedFolder {
  challengeId: number
  folderName: string
  title: string
  files: PlannedFile[]
  totalBytes: number
  reducedCount: number
}

const ZIP_NAME = 'house-photo-hunt-originals.zip'

function pathExtension(path: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(path)
  return match ? match[1].toLowerCase() : 'jpg'
}

/**
 * Deterministic archive layout: one folder per challenge, ordered files per
 * guest. The preview and the generated ZIP share this exact plan, so what is
 * shown is what downloads.
 */
function planArchive(records: OriginalRecord[]): PlannedFolder[] {
  const folders = new Map<number, PlannedFolder>()
  const sorted = [...records].sort(
    (a, b) => a.challengeSortOrder - b.challengeSortOrder || a.ownerName.localeCompare(b.ownerName),
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
        reducedCount: 0,
      }
      folders.set(record.challengeId, folder)
    }
    folder.files.push({
      record,
      fileName: exportEntryName(folder.files.length, record.ownerName, pathExtension(record.originalPath)),
    })
    folder.totalBytes += record.originalBytes
    if (record.originalReduced) folder.reducedCount += 1
  }

  return [...folders.values()]
}

export function OriginalsExport() {
  const [status, setStatus] = useState<Status>(isSupabaseConfigured ? 'loading' : 'unconfigured')
  const [records, setRecords] = useState<OriginalRecord[] | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [message, setMessage] = useState('')
  const cancelRef = useRef(false)
  const storageUsage = useStorageUsage(status === 'ready', 0)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true
    getPartyStatus()
      .then(async (partyStatus) => {
        if (!partyStatus.is_member) {
          if (active) setStatus('not-member')
          return
        }
        const rows = await getAllOriginals()
        if (!active) return
        setRecords(rows)
        setStatus('ready')
      })
      .catch(() => { if (active) setStatus('not-member') })
    return () => { active = false }
  }, [])

  const folders = useMemo(() => planArchive(records ?? []), [records])
  const totalFiles = folders.reduce((total, folder) => total + folder.files.length, 0)
  const totalBytes = folders.reduce((total, folder) => total + folder.totalBytes, 0)

  async function exportAll() {
    if (!folders.length) return
    cancelRef.current = false
    setProgress({ done: 0, total: totalFiles })
    setMessage('')

    try {
      const entries: ZipEntry[] = []
      const manifestChallenges: object[] = []
      let done = 0

      for (const folder of folders) {
        const manifestFiles: object[] = []
        for (const file of folder.files) {
          if (cancelRef.current) {
            setProgress(null)
            setMessage('Export cancelled. Nothing was saved.')
            return
          }
          const blob = await downloadOriginal(file.record.originalPath)
          entries.push({
            name: `${folder.folderName}/${file.fileName}`,
            data: new Uint8Array(await blob.arrayBuffer()),
          })
          manifestFiles.push({
            file: `${folder.folderName}/${file.fileName}`,
            owner: file.record.ownerName,
            original_filename: file.record.originalFilename,
            bytes: file.record.originalBytes,
            mime: file.record.originalMime,
            reduced_from_capture: file.record.originalReduced,
            storage_path: file.record.originalPath,
          })
          done += 1
          setProgress({ done, total: totalFiles })
        }
        manifestChallenges.push({
          challenge: { id: folder.challengeId, folder: folder.folderName, title: folder.title },
          files: manifestFiles,
        })
      }

      entries.push({
        name: 'manifest.json',
        data: new TextEncoder().encode(JSON.stringify({
          exported_at: new Date().toISOString(),
          total_files: totalFiles,
          challenges: manifestChallenges,
        }, null, 2)),
      })

      const archive = zipBlob(entries)
      const url = URL.createObjectURL(archive)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = ZIP_NAME
      anchor.click()
      URL.revokeObjectURL(url)
      setMessage(`ZIP with ${totalFiles} originals (${formatBytes(archive.size)}) saved. Verify it opens and back it up before any cleanup.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export failed.')
    } finally {
      setProgress(null)
    }
  }

  if (status === 'unconfigured') {
    return <p className="originals-export__note">Supabase is not configured in this build, so the export tools are unavailable.</p>
  }
  if (status === 'loading') {
    return <p className="originals-export__note">Checking your party membership…</p>
  }
  if (status === 'not-member') {
    return (
      <p className="originals-export__note">
        Exports require an active party membership. Open the game in this browser, enter the passphrase, then reload this page.
      </p>
    )
  }

  const exporting = progress !== null

  return (
    <div className="originals-export">
      <StorageMeter summary={storageUsage.summary} failed={storageUsage.failed} variant="panel" />

      <div className="originals-export__controls">
        {exporting ? (
          <button type="button" className="button" onClick={() => { cancelRef.current = true }}>
            Cancel ({progress.done}/{progress.total})
          </button>
        ) : (
          <button type="button" className="button button--dark" disabled={!totalFiles} onClick={() => { void exportAll() }}>
            Download ZIP
          </button>
        )}
        <span className="originals-export__note">
          {totalFiles
            ? `${totalFiles} original${totalFiles === 1 ? '' : 's'} · ~${formatBytes(totalBytes)}. Use a desktop browser; the ZIP is built on this device only and nothing is uploaded.`
            : 'No originals are stored yet (submissions made before the archive feature have game copies only).'}
        </span>
      </div>

      {totalFiles > 0 && (
        <div className="zip-preview" aria-label="ZIP contents preview">
          <p className="zip-preview__root">
            <code>{ZIP_NAME}</code> · {totalFiles} {totalFiles === 1 ? 'file' : 'files'} · ~{formatBytes(totalBytes)}
          </p>
          <ul className="zip-preview__folders">
            {folders.map((folder) => (
              <li key={folder.challengeId}>
                <details>
                  <summary>
                    <code>{folder.folderName}/</code>
                    <span>
                      {folder.files.length} {folder.files.length === 1 ? 'photo' : 'photos'} · {formatBytes(folder.totalBytes)}
                      {folder.reducedCount > 0 && ` · ${folder.reducedCount} optimized`}
                    </span>
                  </summary>
                  <ul>
                    {folder.files.map((file) => (
                      <li key={file.record.submissionId}>
                        <code>{file.fileName}</code>
                        <span>
                          {formatBytes(file.record.originalBytes)}
                          {file.record.originalReduced && <em className="zip-preview__badge">optimized</em>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
            <li className="zip-preview__manifest"><code>manifest.json</code></li>
          </ul>
        </div>
      )}

      {message && <p className="originals-export__status" role="status">{message}</p>}
    </div>
  )
}
