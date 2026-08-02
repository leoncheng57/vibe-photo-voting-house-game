import { ReferenceHeader } from './SystemDiagram'

const hostRunbookPageUrl = `${import.meta.env.BASE_URL}developer/host-runbook/`
const photoExportPageUrl = `${import.meta.env.BASE_URL}developer/photo-export/`

export function RunOfShowRunbook() {
  return (
    <main className="developer-system">
      <ReferenceHeader
        path="/developer/run-of-show"
        title="Run of Show Runbook"
        description="The operating plan for a hosted event: preflight, three party phases, hotfix protocol, and feature status. The host controls the shared TV and phase changes; guests play from their own phones at /play/. The timer is a visual cue only and never locks uploads or voting."
      />

      <nav className="dev-index" aria-label="Run of show sections">
        <a href="#preflight">01 Preflight</a>
        <a href="#phase-1">02 Arrival</a>
        <a href="#phase-2">03 Photo hunt</a>
        <a href="#phase-3">04 Voting and winners</a>
        <a href="#hotfix">05 Hotfix protocol</a>
        <a href="#feature-status">06 Feature status</a>
      </nav>

      <section className="dev-section" id="preflight">
        <header><span>01</span><div><h2>Preflight — Before Guests Arrive</h2><p>Complete every step before sharing the link with anyone.</p></div></header>
        <ol className="originals-runbook">
          <li><b>Open the party.</b> Confirm the passphrase admits one guest browser end to end.</li>
          <li><b>Check the TV.</b> Confirm TV mode loads, the QR code points to <code>/play/</code>, and the TV browser stays signed in.</li>
          <li><b>Dry-run one photo.</b> Upload one synthetic test photo, confirm it appears on TV, vote for it from a second browser profile, then remove all test data using the coordinated cleanup runbook — database row first, Storage object second.</li>
          <li><b>Check storage headroom.</b> Open the Photo Export Runbook and verify the storage meter is comfortably below 50%.</li>
          <li><b>Stage the credentials.</b> Put the party link and passphrase somewhere the host can share without displaying the passphrase in the QR code.</li>
          <li><b>Keep a host laptop nearby.</b> Use it for host controls and hotfixes, but never expose Supabase credentials or guest data on the TV.</li>
        </ol>
      </section>

      <section className="dev-section" id="phase-1">
        <header><span>02</span><div><h2>Phase 1: Arrival and Instructions</h2><p>Typical duration: 15–30 minutes, or until most guests have joined.</p></div></header>
        <div className="dev-facts">
          <article>
            <h3>Guests</h3>
            <code>join → name → browse</code>
            <ul>
              <li>Open the link or scan the TV QR code.</li>
              <li>Enter the host-provided passphrase.</li>
              <li>Choose a unique display name. A guest may edit it later without changing identity, submissions, or votes.</li>
              <li>Read How to Play and start browsing challenges.</li>
            </ul>
          </article>
          <article>
            <h3>Host</h3>
            <code>TV on How to Play</code>
            <ul>
              <li>Leave the TV on the How to Play tab so late arrivals receive the same instructions; the rotating Gallery also shows a join QR code for latecomers.</li>
              <li>Verbally explain that each browser profile is one guest identity — a second guest needs another browser or browser profile, not another tab.</li>
              <li>Confirm guests can reach the challenge list before starting photo time.</li>
              <li>Explain that photographers remain anonymous during voting and that self-voting is allowed.</li>
            </ul>
          </article>
          <article>
            <h3>Transition check</h3>
            <code>ready for photo time?</code>
            <ul>
              <li>Most expected guests have joined.</li>
              <li>The TV shows the gallery correctly.</li>
              <li>At least one host-observed upload has succeeded.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="dev-section" id="phase-2">
        <header><span>03</span><div><h2>Phase 2: Photo Hunt</h2><p>Typical duration: about 90 minutes.</p></div></header>
        <div className="dev-facts">
          <article>
            <h3>Guests</h3>
            <code>one photo per challenge</code>
            <ul>
              <li>Move around the house and take photos for any challenges they want to join.</li>
              <li>Submit one photo per challenge and review the uploaded preview before leaving the page.</li>
              <li>A photo may be replaced until it receives a vote; replacement uploads a new original version and removes the superseded one.</li>
              <li>A photo that has already received votes cannot be replaced or deleted.</li>
            </ul>
          </article>
          <article>
            <h3>Host</h3>
            <code>timer + gallery + meter</code>
            <ul>
              <li>Start the device-local photo timer from the TV mode header.</li>
              <li>Leave the TV on the rotating Gallery so guests can see new submissions arrive; tap any photo for a full-image preview.</li>
              <li>Watch the storage meter periodically and follow the thresholds below.</li>
              <li>Never delete a referenced Storage object directly.</li>
            </ul>
          </article>
          <article>
            <h3>Transition check</h3>
            <code>ready for voting?</code>
            <ul>
              <li>A final-photo warning has been announced.</li>
              <li>Active uploads have been allowed to finish.</li>
              <li>Every challenge intended for voting has submissions.</li>
            </ul>
          </article>
        </div>
        <div className="dev-table-wrap">
          <table className="dev-table">
            <thead><tr><th>Storage meter</th><th>Host action</th></tr></thead>
            <tbody>
              <tr><th>Below 50%</th><td>No action is normally needed.</td></tr>
              <tr><th>50–75%</th><td>Prepare to export the originals ZIP; discourage unnecessary replacements.</td></tr>
              <tr><th>At or above 75%</th><td>Pause new uploads if practical, export and verify the originals ZIP, then follow the Photo Export Runbook cleanup exactly — clear database references first, delete Storage objects second.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="dev-section" id="phase-3">
        <header><span>04</span><div><h2>Phase 3: Voting and Winners</h2><p>Typical duration: about one minute per challenge, plus the final reveal.</p></div></header>
        <div className="dev-facts">
          <article>
            <h3>Guests</h3>
            <code>ballots on phones</code>
            <ul>
              <li>Open Vote on their phones.</li>
              <li>Vote on the challenge currently shown by the host with up to three choices. Deselect every photo and confirm zero votes to clear a saved ballot.</li>
              <li>Submit a ballot, then revisit earlier challenges to change saved votes if desired.</li>
              <li>Keep the TV for shared instructions and reveals rather than entering votes there.</li>
            </ul>
          </article>
          <article>
            <h3>Host</h3>
            <code>one challenge at a time</code>
            <ul>
              <li>Move through challenges one at a time using the TV Voting view.</li>
              <li>Announce the challenge and allow roughly one minute for ballots.</li>
              <li>Reveal each challenge only after the room confirms voting is complete.</li>
              <li>Results never appear on guest phones. After each round, press and hold <b>Reveal challenge winner</b> until its progress fill completes to show the winning photo or tied photos.</li>
              <li>When all rounds end, select the robot button and confirm the host-only final-score dialog. The guest with the most total votes received wins; tied totals share a rank.</li>
              <li>Award prizes only after the final result refresh.</li>
            </ul>
          </article>
          <article>
            <h3>Finish</h3>
            <code>export → close → clean</code>
            <ul>
              <li>Export and verify the originals ZIP plus <code>manifest.json</code> before any cleanup.</li>
              <li>Save any desired screenshots using synthetic or approved data only.</li>
              <li>Close the party to block further database and Storage access.</li>
              <li>Follow the Event Cleanup section in the README before reusing the project.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="dev-section" id="hotfix">
        <header><span>05</span><div><h2>Hotfix Protocol</h2><p>If something fails during the event, stabilize first and preserve privacy and data.</p></div></header>
        <ol className="originals-runbook">
          <li><b>Stabilize.</b> Keep the current phase stable; do not ask guests to repeat writes until the failure is understood.</li>
          <li><b>Record safely.</b> Note the affected challenge, action, browser, and approximate time — never record the passphrase or private photo URLs.</li>
          <li><b>Prefer reversible workarounds.</b> Advance manually, extend the timer, or skip one challenge.</li>
          <li><b>Hold the security line.</b> Do not change RLS, expose a service-role key, or delete Storage objects as a live workaround.</li>
          <li><b>Stop if uncertain.</b> If privacy, authentication, or data preservation is uncertain, close the party and stop writes.</li>
        </ol>
      </section>

      <section className="dev-section" id="feature-status">
        <header><span>06</span><div><h2>Feature Status</h2><p>What this plan assumes is shipped, and what remains open before the event.</p></div></header>
        <div className="dev-grid">
          <article>
            <h3>Already shipped and assumed by this plan</h3>
            <ul>
              <li>TV Gallery rotation with countdown, full-image preview, and latecomer join QR (issues #27, #52, #56).</li>
              <li>TV Voting and How to Play pages (issue #34).</li>
              <li>Timer creation and editing in the TV mode header, with an end-of-timer beep and blinking alert (issues #36, #55).</li>
              <li>Flexible, editable 1–3 vote ballots (issue #35).</li>
              <li>TV-only, host-confirmed final scoreboard (issue #41).</li>
              <li>Deep-linkable application views (issue #54).</li>
              <li>Full-resolution original archive with storage meter and export runbook.</li>
            </ul>
          </article>
          <article>
            <h3>Still outstanding before the event</h3>
            <ul>
              <li>Append-only replacement-photo preservation — today a replacement removes the superseded original version: issue #37 (PR #51).</li>
              <li>Full UI/UX test pass against a disposable Supabase project: issue #24.</li>
            </ul>
          </article>
        </div>
      </section>

      <p className="dev-crosslink">Passphrase and party lifecycle commands live on the <a href={hostRunbookPageUrl}>Host Password Runbook →</a> · Originals export and cleanup live on the <a href={photoExportPageUrl}>Photo Export Runbook →</a></p>
    </main>
  )
}
