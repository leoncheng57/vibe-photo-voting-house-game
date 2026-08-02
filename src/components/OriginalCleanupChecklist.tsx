import { useEffect, useMemo, useState } from 'react'
import { deleteApprovedOriginals, getOriginalCleanupStatus } from '../lib/api'
import { errorMessage } from '../lib/errors'
import { summarizeOriginalCleanup, type OriginalExportSession } from '../lib/original-export'
import { formatBytes } from '../lib/photo-policy'
import { supabaseSqlEditorUrl } from '../lib/supabase'
import type { OriginalCleanupStatus } from '../types'

interface Props {
  session: OriginalExportSession | null
  onComplete: () => void
}

function StepNumber({ done, number }: { done: boolean; number: number }) {
  return <span className={`cleanup-step__number${done ? ' cleanup-step__number--done' : ''}`}>{done ? 'DONE' : String(number).padStart(2, '0')}</span>
}

export function OriginalCleanupChecklist({ session, onComplete }: Props) {
  const [verified, setVerified] = useState(false)
  const [backedUp, setBackedUp] = useState(false)
  const [status, setStatus] = useState<OriginalCleanupStatus[] | null>(null)
  const [busy, setBusy] = useState<'approval' | 'deletion' | null>(null)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    setVerified(false)
    setBackedUp(false)
    setStatus(null)
    setMessage('')
    setCopied(false)
    setConfirming(false)
  }, [session?.cleanupSql])

  const summary = summarizeOriginalCleanup(status ?? [], session?.versionIds.length ?? 0)
  const allApproved = Boolean(session && summary.allApproved)
  const remainingObjects = session && status ? summary.remainingObjects : session?.totalFiles ?? 0
  const objectsRemoved = allApproved && remainingObjects === 0
  const deletionRecorded = Boolean(session && summary.deletionRecorded)
  const completedSteps = useMemo(() => [Boolean(session), verified, backedUp, allApproved, objectsRemoved, deletionRecorded].filter(Boolean).length, [session, verified, backedUp, allApproved, objectsRemoved, deletionRecorded])

  async function checkApproval() {
    if (!session) return
    setBusy('approval')
    setMessage('')
    try {
      const nextStatus = await getOriginalCleanupStatus(session.versionIds)
      setStatus(nextStatus)
      const approvedCount = nextStatus.filter((row) => row.approved).length
      setMessage(approvedCount === session.totalFiles
        ? `All ${approvedCount} exported originals are approved for deletion.`
        : `${approvedCount} of ${session.totalFiles} originals are approved. Run the SQL below, then check again.`)
    } catch (error) {
      setMessage(errorMessage(error, 'Could not verify cleanup approval.'))
    } finally {
      setBusy(null)
    }
  }

  async function deleteOriginals() {
    if (!session) return
    setConfirming(false)
    setBusy('deletion')
    setMessage('')
    try {
      const nextStatus = await deleteApprovedOriginals(session.versionIds)
      setStatus(nextStatus)
      if (nextStatus.every((row) => row.deletionRecorded)) {
        setMessage(`Cleanup complete. ${session.totalFiles} archived originals were deleted and recorded.`)
        onComplete()
      } else {
        setMessage('Some originals remain. Check approval and retry the deletion.')
      }
    } catch (error) {
      setMessage(errorMessage(error, 'Could not delete every approved original.'))
      try {
        setStatus(await getOriginalCleanupStatus(session.versionIds))
      } catch {
        // Keep the original operation error visible.
      }
    } finally {
      setBusy(null)
    }
  }

  async function copySql() {
    if (!session) return
    try {
      await navigator.clipboard.writeText(session.cleanupSql)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setMessage('Clipboard access was denied. Select and copy the SQL manually.')
    }
  }

  if (!session) {
    return (
      <div className="cleanup-empty">
        <span>0 / 6 complete</span>
        <h3>Download a ZIP to begin cleanup.</h3>
        <p>The exact SQL and deletion controls appear here only after this browser assembles an export.</p>
      </div>
    )
  }

  return (
    <div className="cleanup-checklist">
      <header>
        <div><span className="eyebrow">Guided cleanup</span><h3>{completedSteps} / 6 complete</h3></div>
        <div className="cleanup-progress" aria-label={`${completedSteps} of 6 cleanup steps complete`}><i style={{ width: `${(completedSteps / 6) * 100}%` }} /></div>
      </header>

      <ol>
        <li className="cleanup-step cleanup-step--complete">
          <StepNumber done number={1} />
          <div><h4>ZIP downloaded</h4><p>{session.totalFiles} originals · {formatBytes(session.totalBytes)} source bytes · {formatBytes(session.archiveBytes)} ZIP</p></div>
        </li>

        <li className={`cleanup-step${verified ? ' cleanup-step--complete' : ''}`}>
          <StepNumber done={verified} number={2} />
          <label><input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} /><span><b>Verify the ZIP</b><small>It opens, its file count matches, and you spot-checked <code>manifest.json</code> plus a few images.</small></span></label>
        </li>

        <li className={`cleanup-step${backedUp ? ' cleanup-step--complete' : ''}${!verified ? ' cleanup-step--locked' : ''}`}>
          <StepNumber done={backedUp} number={3} />
          <label><input type="checkbox" checked={backedUp} disabled={!verified} onChange={(event) => setBackedUp(event.target.checked)} /><span><b>Back up the ZIP</b><small>A copy exists in Drive, iCloud, or another location outside this computer.</small></span></label>
        </li>

        <li className={`cleanup-step cleanup-step--stacked${allApproved ? ' cleanup-step--complete' : ''}${!backedUp ? ' cleanup-step--locked' : ''}`}>
          <StepNumber done={allApproved} number={4} />
          <div className="cleanup-step__body">
            <h4>Approve this exact export</h4>
            <p>Copy this generated SQL into the Supabase SQL Editor. It approves and detaches only the versions inside this ZIP.</p>
            <pre className="cleanup-sql"><code>{session.cleanupSql}</code></pre>
            <div className="cleanup-actions">
              <button type="button" className="button" disabled={!backedUp} onClick={() => { void copySql() }}>{copied ? 'Copied SQL' : 'Copy SQL'}</button>
              {supabaseSqlEditorUrl && <a className="button" aria-disabled={!backedUp} href={supabaseSqlEditorUrl} target="_blank" rel="noreferrer" tabIndex={backedUp ? 0 : -1} onClick={(event) => { if (!backedUp) event.preventDefault() }}>Open SQL Editor</a>}
              <button type="button" className="button button--dark" disabled={!backedUp || busy !== null} onClick={() => { void checkApproval() }}>{busy === 'approval' ? 'Checking…' : 'I ran it — check approval'}</button>
            </div>
          </div>
        </li>

        <li className={`cleanup-step${objectsRemoved ? ' cleanup-step--complete' : ''}${!allApproved ? ' cleanup-step--locked' : ''}`}>
          <StepNumber done={objectsRemoved} number={5} />
          <div className="cleanup-step__body">
            <h4>Delete approved originals</h4>
            <p>{objectsRemoved ? 'Every approved Storage object is gone.' : allApproved ? `${remainingObjects} approved original${remainingObjects === 1 ? '' : 's'} will be deleted. Newer, unapproved uploads cannot be touched.` : `${session.totalFiles} exported originals become deletable only after the exact SQL approval is verified.`}</p>
            {!objectsRemoved && <button type="button" className="button button--danger" disabled={!allApproved || busy !== null} onClick={() => setConfirming(true)}>{busy === 'deletion' ? 'Deleting…' : `Delete ${remainingObjects} approved original${remainingObjects === 1 ? '' : 's'}`}</button>}
          </div>
        </li>

        <li className={`cleanup-step${deletionRecorded ? ' cleanup-step--complete' : ''}${!objectsRemoved ? ' cleanup-step--locked' : ''}`}>
          <StepNumber done={deletionRecorded} number={6} />
          <div><h4>Deletion recorded</h4><p>{deletionRecorded ? 'Ledger tombstones are saved and the storage meter has been refreshed.' : 'After Storage deletion, the app records only objects confirmed absent.'}</p></div>
        </li>
      </ol>

      {message && <p className="cleanup-message" role="status">{message}</p>}

      {confirming && (
        <div className="cleanup-confirm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirming(false) }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="cleanup-confirm-title">
            <span className="eyebrow">Irreversible step</span>
            <h3 id="cleanup-confirm-title">Delete {remainingObjects} approved originals?</h3>
            <p>The verified ZIP is now the retained copy. Only this export’s host-approved Storage paths will be removed.</p>
            <div><button type="button" className="button" onClick={() => setConfirming(false)}>Cancel</button><button type="button" className="button button--danger" onClick={() => { void deleteOriginals() }}>Delete approved originals</button></div>
          </section>
        </div>
      )}
    </div>
  )
}
