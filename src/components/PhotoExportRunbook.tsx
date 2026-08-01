import { OriginalsExport } from './OriginalsExport'
import { CopySqlCell, ReferenceHeader } from './SystemDiagram'

export function PhotoExportRunbook() {
  return (
    <main className="developer-system">
      <ReferenceHeader
        path="/developer/photo-export"
        title="Photo Export Runbook"
        description="Download every full-resolution original as one ZIP, then reclaim Supabase storage challenge by challenge."
      />

      <nav className="dev-index" aria-label="Photo export sections"><a href="#export">01 Export</a><a href="#cleanup">02 Cleanup</a></nav>

      <section className="dev-section" id="export">
        <header><span>01</span><div><h2>Export Originals</h2><p>Every submission stores its full-resolution original in the private photo-originals bucket. The preview below shows the exact folder structure the ZIP will contain; nothing downloads until you press the button.</p></div></header>
        <OriginalsExport />
      </section>

      <section className="dev-section" id="cleanup">
        <header><span>02</span><div><h2>Cleanup After Export</h2><p>Cleanup is irreversible — only run it after the exported ZIP is verified and backed up. The ZIP contains every stored original, so cleanup clears them all at once.</p></div></header>

        <ol className="originals-runbook">
          <li><b>Export.</b> Download the ZIP above on a desktop browser. The archive is assembled locally; nothing leaves this device.</li>
          <li><b>Verify.</b> Open the ZIP, confirm each challenge folder's photo count matches the preview, and spot-check a few images plus <code>manifest.json</code>.</li>
          <li><b>Back up.</b> Copy the ZIP to Drive, iCloud, or another location outside this computer.</li>
          <li><b>Clear database references.</b> In the Supabase SQL editor, run the command below. It clears every submission's original reference in one step.</li>
          <li><b>Delete the objects.</b> In the Supabase dashboard open Storage → <code>photo-originals</code> and delete every folder (originals are stored under <code>{'{challenge_id}/{user_id}/…'}</code>). Do this only after step 4, so no submission still references those objects.</li>
          <li><b>Confirm.</b> Reload this page; the storage meter above should show the reclaimed space, and the ZIP preview should be empty. Photos uploaded after cleanup store fresh originals and appear in the next export.</li>
        </ol>

        <div className="dev-table-wrap">
          <table className="dev-table">
            <thead><tr><th>Action</th><th>SQL editor command</th><th>Effect</th></tr></thead>
            <tbody>
              <tr>
                <th>Clear all exported original references</th>
                <td><CopySqlCell sql={"update submissions\nset original_path = null, original_filename = null,\n    original_mime = null, original_bytes = null,\n    original_width = null, original_height = null,\n    original_status = null, original_source_bytes = null,\n    original_source_mime = null\nwhere original_path is not null;"} /></td>
                <td>Detaches every archived original from its submission. Game copies, votes, and scores are untouched. Run this before emptying the photo-originals bucket.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
