import { ReferenceHeader } from './SystemDiagram'

const hostRunbookPageUrl = `${import.meta.env.BASE_URL}developer/host-runbook/`
const photoExportPageUrl = `${import.meta.env.BASE_URL}developer/photo-export/`
const bdayHuntUrl = `${import.meta.env.BASE_URL}bday-hunt/`

export function RunOfShowRunbook() {
  return (
    <main className="developer-system">
      <ReferenceHeader
        path="/developer/run-of-show"
        title="Run of Show Runbook"
        description="The operating plan for the Outdoor Birthday Hunt: preflight, three party phases, hotfix protocol, and feature status. The host controls the shared TV and phase changes; guests play from their own phones at /bday-hunt/. Winners are drawn at random, so there is no voting. The timer is a visual cue only and never locks uploads."
      />

      <nav className="dev-index" aria-label="Run of show sections">
        <a href="#preflight">01 Preflight</a>
        <a href="#phase-1">02 Arrival</a>
        <a href="#phase-2">03 Photo hunt</a>
        <a href="#phase-3">04 Draw and winners</a>
        <a href="#hotfix">05 Hotfix protocol</a>
        <a href="#feature-status">06 Feature status</a>
      </nav>

      <section className="dev-section" id="preflight">
        <header><span>01</span><div><h2>Preflight — Before Guests Arrive</h2><p>Complete every step before sharing the link with anyone.</p></div></header>
        <ol className="originals-runbook">
          <li><b>Open the party.</b> Confirm the passphrase admits one guest browser end to end at <a href={bdayHuntUrl}><code>/bday-hunt/</code></a>.</li>
          <li><b>Check the winner mode.</b> Open <code>/bday-hunt/?settings</code>, enter the host PIN, and confirm Winner is <b>Random</b>. The saved setting overrides the app default once a guest joins, so a stray <b>Voting</b> brings the Vote tab back.</li>
          <li><b>Check the prompts.</b> The challenge list shows the three birthday prompts: Accidental Twins, Peak Candid and Birthday Boy.</li>
          <li><b>Check the TV.</b> Confirm <code>/bday-hunt/?display</code> loads, the QR code points to <code>/bday-hunt/</code>, and the TV browser stays signed in.</li>
          <li><b>Dry-run one photo.</b> Upload one synthetic test photo, confirm it appears on TV and on the Draw tab, then remove all test data using the coordinated cleanup runbook — database row first, Storage object second.</li>
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
              <li>Choose a unique display name. A guest may edit it later without changing identity or submissions.</li>
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
              <li>Explain that there is no voting: each prompt's winner is drawn at random from its entries, so every photo has the same chance.</li>
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
              <li>Roam and take photos for any of the three prompts they want to join. Birthday Boy needs the birthday boy in the frame.</li>
              <li>Submit one photo per challenge and review the uploaded preview before leaving the page.</li>
              <li>Replacement uploads a new immutable original and game version while preserving every earlier original for export.</li>
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
            <code>ready for the draw?</code>
            <ul>
              <li>A final-photo warning has been announced.</li>
              <li>Active uploads have been allowed to finish.</li>
              <li>Every prompt has at least one entry; a prompt with none has nothing to draw.</li>
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
        <header><span>04</span><div><h2>Phase 3: Draw and Winners</h2><p>Typical duration: a few minutes, plus the final reveal.</p></div></header>
        <div className="dev-facts">
          <article>
            <h3>Guests</h3>
            <code>watch the TV</code>
            <ul>
              <li>Nothing to do on phones: random mode hides the Vote tab, and an old <code>?vote</code> link lands on the challenge list.</li>
              <li>Results never appear on guest phones; the reveal happens on the TV.</li>
            </ul>
          </article>
          <article>
            <h3>Host</h3>
            <code>one prompt at a time</code>
            <ul>
              <li>Open the TV <b>Draw</b> tab and step through the prompts with the arrow buttons or ← → keys.</li>
              <li>Announce the prompt, then press and hold <b>Hold to reveal winner</b> until its progress fill completes to show the drawn photo.</li>
              <li>The draw is seeded by the prompt and its entries: going back, reloading, or opening TV mode on another screen shows the same winner. A replaced or new photo changes the entries and therefore the draw, so finish uploads first.</li>
              <li>When all prompts are drawn, select the robot button and confirm the host-only final-score dialog. The guest with the most draw wins is the birthday champion; tied totals share a rank.</li>
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
        <p className="dev-crosslink">Running an event with voting instead? Set Winner to <b>Voting</b> in settings: guests get the Vote tab and pick up to three photos per challenge, and the TV tab becomes Voting, with the same hold-to-reveal and final-score steps counting votes received.</p>
      </section>

      <section className="dev-section" id="hotfix">
        <header><span>05</span><div><h2>Hotfix Protocol</h2><p>If something fails during the event, stabilize first and preserve privacy and data.</p></div></header>
        <ol className="originals-runbook">
          <li><b>Stabilize.</b> Keep the current phase stable; do not ask guests to repeat writes until the failure is understood.</li>
          <li><b>Record safely.</b> Note the affected challenge, action, browser, and approximate time — never record the passphrase or private photo URLs.</li>
          <li><b>Prefer reversible workarounds.</b> Advance manually, extend the timer, or skip one prompt.</li>
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
              <li>TV Draw (or Voting) and How to Play pages (issue #34).</li>
              <li>Random winner mode with a seeded, repeatable draw and no voting, set per project from the host settings screen (issue #86).</li>
              <li>Three birthday prompts, with copy that counts the prompts from the data (issue #86).</li>
              <li>Timer creation and editing in the TV mode header, with an end-of-timer beep and blinking alert (issues #36, #55).</li>
              <li>Flexible, editable 1–3 vote ballots for voting mode (issue #35).</li>
              <li>TV-only, host-confirmed final scoreboard (issue #41).</li>
              <li>Deep-linkable application views (issue #54).</li>
              <li>Full-resolution original archive with storage meter and export runbook.</li>
            </ul>
          </article>
          <article>
            <h3>Still outstanding before the event</h3>
            <ul>
              <li>Full UI/UX test pass against a disposable Supabase project: issue #24.</li>
            </ul>
          </article>
        </div>
      </section>

      <p className="dev-crosslink">Passphrase and party lifecycle commands live on the <a href={hostRunbookPageUrl}>Host Password Runbook →</a> · Originals export and cleanup live on the <a href={photoExportPageUrl}>Photo Export Runbook →</a></p>
    </main>
  )
}
