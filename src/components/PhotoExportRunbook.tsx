import { OriginalsExport } from './OriginalsExport'
import { CopySqlCell, ReferenceHeader } from './SystemDiagram'

export function PhotoExportRunbook() {
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
        <OriginalsExport />
      </section>

      <section className="dev-section" id="cleanup">
        <header><span>02</span><div><h2>Cleanup After Export</h2><p>Cleanup is irreversible and host-only. Run it only after the versioned ZIP and manifest are verified and backed up.</p></div></header>

        <ol className="originals-runbook">
          <li><b>Export.</b> Download the ZIP above on a desktop browser. The archive is assembled locally; nothing leaves this device.</li>
          <li><b>Verify.</b> Open the ZIP, confirm each challenge folder's photo count matches the preview, and spot-check a few images plus <code>manifest.json</code>.</li>
          <li><b>Back up.</b> Copy the ZIP to Drive, iCloud, or another location outside this computer.</li>
          <li><b>Approve and detach.</b> Open <code>cleanup.sql</code> from the verified ZIP and run it in the Supabase SQL editor. It affects only version IDs contained in that exact export.</li>
          <li><b>Delete the exported objects.</b> In Storage → <code>photo-originals</code>, delete only the <code>storage_path</code> values listed in that ZIP's <code>manifest.json</code>. Do not empty the bucket; newer uploads may exist.</li>
          <li><b>Record deletion.</b> Run the confirmation command below. It tombstones only approved ledger rows whose Storage object is gone.</li>
          <li><b>Confirm.</b> Reload this page; the storage meter should show reclaimed space and the ZIP preview should be empty. Ledger tombstones remain for audit.</li>
          <li><b>Optional game-copy cleanup.</b> Historical game JPEGs are not part of the originals ZIP. Use the query below to list only superseded game paths, delete those exact objects from <code>photos</code>, then record their deletion.</li>
        </ol>

        <div className="dev-table-wrap">
          <table className="dev-table">
            <thead><tr><th>Action</th><th>SQL editor command</th><th>Effect</th></tr></thead>
            <tbody>
              <tr>
                <th>Approve only this export</th>
                <td><CopySqlCell sql={"-- Use cleanup.sql generated inside the verified ZIP.\n-- It contains an exact array of exported original_versions.id values."} /></td>
                <td>Prevents cleanup from racing with uploads created after the ZIP was assembled.</td>
              </tr>
              <tr>
                <th>Confirm approved objects were deleted</th>
                <td><CopySqlCell sql={"update original_versions versions\nset deleted_at = now()\nwhere cleanup_approved_at is not null\n  and deleted_at is null\n  and not exists (\n    select 1 from storage.objects objects\n    where objects.bucket_id = 'photo-originals'\n      and objects.name = versions.original_path\n  );"} /></td>
                <td>Retains immutable tombstone metadata while removing deleted versions from future exports.</td>
              </tr>
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
      </section>
    </main>
  )
}
