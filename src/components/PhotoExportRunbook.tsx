import { useState } from 'react'
import type { OriginalExportSession } from '../lib/original-export'
import { OriginalCleanupChecklist } from './OriginalCleanupChecklist'
import { OriginalsExport } from './OriginalsExport'
import { CopySqlCell, ReferenceHeader } from './SystemDiagram'

export function PhotoExportRunbook() {
  const [exportSession, setExportSession] = useState<OriginalExportSession | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  function handleExported(session: OriginalExportSession) {
    setExportSession(session)
    requestAnimationFrame(() => document.querySelector('#cleanup')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <main className="developer-system">
      <ReferenceHeader
        path="/developer/photo-export"
        title="Photo Export Runbook"
        description="Download every retained original version as one ZIP, then reclaim Supabase storage with host-only verified cleanup."
      />

      <nav className="dev-index" aria-label="Photo export sections"><a href="#export">01 Export</a><a href="#cleanup">02 Cleanup</a></nav>

      <section className="dev-section" id="export">
        <header><span>01</span><div><h2>Export Originals</h2><p>Every upload reserves an append-only archive record. The ZIP includes current, superseded, and physically present recovery versions; participant replacement never deletes them.</p></div></header>
        <OriginalsExport onExported={handleExported} refreshToken={refreshToken} />
      </section>

      <section className="dev-section" id="cleanup">
        <header><span>02</span><div><h2>Cleanup After Export</h2><p>Follow the gated checklist. The app verifies SQL approval before it can delete exact exported Storage paths.</p></div></header>

        <OriginalCleanupChecklist session={exportSession} onComplete={() => setRefreshToken((token) => token + 1)} />

        <details className="cleanup-advanced">
          <summary>Optional: clean up superseded game copies</summary>
          <p>Historical game JPEGs are not part of the originals ZIP. These recovery commands identify only paths no active submission uses.</p>
          <div className="dev-table-wrap">
            <table className="dev-table">
              <thead><tr><th>Action</th><th>SQL editor command</th><th>Effect</th></tr></thead>
              <tbody>
              <tr>
                <th>List superseded game copies</th>
                <td><CopySqlCell sql={"select versions.game_path\nfrom original_versions versions\nleft join submissions\n  on submissions.storage_path = versions.game_path\nwhere submissions.id is null\n  and (\n    versions.state = 'ready'\n    or versions.cleanup_approved_at is not null\n  )\n  and versions.game_deleted_at is null\norder by versions.created_at;"} /></td>
                <td>Delete only these exact derived JPEG paths from the <code>photos</code> bucket. Current game copies are excluded.</td>
              </tr>
              <tr>
                <th>Confirm superseded game-copy deletion</th>
                <td><CopySqlCell sql={"update original_versions versions\nset game_deleted_at = now()\nwhere game_deleted_at is null\n  and not exists (\n    select 1 from storage.objects objects\n    where objects.bucket_id = 'photos'\n      and objects.name = versions.game_path\n  );"} /></td>
                <td>Records host cleanup of derived copies without affecting any archived original.</td>
              </tr>
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </main>
  )
}
