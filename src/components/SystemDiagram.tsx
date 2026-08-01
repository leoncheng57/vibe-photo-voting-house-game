import { useState } from 'react'

const runbookPageUrl = `${import.meta.env.BASE_URL}developer/host-runbook/`
const photoExportPageUrl = `${import.meta.env.BASE_URL}developer/photo-export/`

const schemaNodes = [
  {
    name: 'memberships',
    namespace: 'public',
    description: 'Admitted guests; rows are created only by the join_party passphrase check.',
    position: { left: 40, top: 40, width: 320 },
    constraints: ['Insert only via join_party()'],
    fields: [
      { name: 'user_id', type: 'uuid', flags: ['PK', 'FK'] },
      { name: 'created_at', type: 'timestamptz', flags: [] },
    ],
  },
  {
    name: 'party_settings',
    namespace: 'public',
    description: 'Host-only single row: bcrypt passphrase hash and the open/closed switch.',
    position: { left: 840, top: 730, width: 300 },
    constraints: ['Single host-managed row; no client access'],
    fields: [
      { name: 'id', type: 'bool', flags: ['PK'] },
      { name: 'passphrase_hash', type: 'text', flags: [] },
      { name: 'is_open', type: 'bool', flags: [] },
      { name: 'updated_at', type: 'timestamptz', flags: [] },
    ],
  },
  {
    name: 'profiles',
    namespace: 'public',
    description: 'Party identity associated with an anonymous Auth user.',
    position: { left: 420, top: 40, width: 340 },
    constraints: ['UNIQUE (lower(trim(display_name)))'],
    fields: [
      { name: 'user_id', type: 'uuid', flags: ['PK', 'FK'] },
      { name: 'display_name', type: 'text', flags: ['UQ'] },
      { name: 'created_at', type: 'timestamptz', flags: [] },
    ],
  },
  {
    name: 'challenges',
    namespace: 'public',
    description: 'Ordered catalog of six photo prompts.',
    position: { left: 800, top: 320, width: 340 },
    constraints: [],
    fields: [
      { name: 'id', type: 'int2', flags: ['PK'] },
      { name: 'slug', type: 'text', flags: ['UQ'] },
      { name: 'title', type: 'text', flags: [] },
      { name: 'prompt', type: 'text', flags: [] },
      { name: 'kicker', type: 'text', flags: [] },
      { name: 'sort_order', type: 'int2', flags: ['UQ'] },
    ],
  },
  {
    name: 'submissions',
    namespace: 'public',
    description: 'Single active photo submitted by a user to a challenge.',
    position: { left: 40, top: 280, width: 360 },
    constraints: ['UNIQUE (challenge_id, user_id)', 'UNIQUE (id, challenge_id)'],
    fields: [
      { name: 'id', type: 'uuid', flags: ['PK'] },
      { name: 'challenge_id', type: 'int2', flags: ['FK'] },
      { name: 'user_id', type: 'uuid', flags: ['FK'] },
      { name: 'storage_path', type: 'text', flags: ['UQ'] },
      { name: 'created_at', type: 'timestamptz', flags: [] },
    ],
  },
  {
    name: 'votes',
    namespace: 'public',
    description: 'One selected submission within a voter’s three-choice ballot.',
    position: { left: 430, top: 590, width: 350 },
    constraints: ['PK (voter_id, challenge_id, submission_id)', 'FK (submission_id, challenge_id)'],
    fields: [
      { name: 'voter_id', type: 'uuid', flags: ['PK', 'FK'] },
      { name: 'challenge_id', type: 'int2', flags: ['PK', 'FK'] },
      { name: 'submission_id', type: 'uuid', flags: ['PK', 'FK'] },
      { name: 'created_at', type: 'timestamptz', flags: [] },
    ],
  },
]

const requestFlows = [
  ['Identity bootstrap', 'supabase.auth.signInAnonymously()', 'auth.users → profiles', 'Persistent JWT session scoped to one browser.'],
  ['Party admission', 'rpc(\'join_party\')', 'party_settings → memberships', 'SECURITY DEFINER bcrypt check; a wrong passphrase never creates a membership.'],
  ['Photo submission', 'reserve_original_version() + Storage + activate_original_version()', 'original_versions → photo-originals + photos → submissions', 'Append-only original metadata is reserved before upload; activation switches only the current submission pointer.'],
  ['Photo read', 'storage.download()', 'photos bucket → local blob URL', 'Authenticated, membership-gated download; no reusable signed URLs are issued.'],
  ['Ballot write', 'rpc(\'submit_votes\')', 'submissions → votes', 'Choices bind to immutable game paths and lock against concurrent photo activation before atomically replacing the ballot.'],
  ['Result query', 'challenge_results + leaderboard', 'votes → ranked views', 'Membership-gated views; Postgres rank() implements competition ranking with 3/2/1 podium points.'],
]

export function ReferenceHeader({ path, title, description }: { path: string; title: string; description: string }) {
  return (
    <header className="dev-header">
      <div><code>{path}</code><h1>{title}</h1><p>{description}</p></div>
      <dl>
        <div><dt>frontend</dt><dd>React 19 / Vite 7</dd></div>
        <div><dt>backend</dt><dd>Supabase</dd></div>
        <div><dt>hosting</dt><dd>GitHub Pages</dd></div>
        <div><dt>revision</dt><dd>schema v2</dd></div>
      </dl>
    </header>
  )
}

export function SystemDiagram() {
  return (
    <main className="developer-system">
      <ReferenceHeader path="/developer/system" title="Photo Hunt System Reference" description="Runtime architecture and browser-initiated request flows." />

      <nav className="dev-index" aria-label="System reference sections">
        <a href="#architecture">01 Architecture</a>
        <a href="#flows">02 Request flows</a>
      </nav>

      <section className="dev-section" id="architecture">
        <header><span>01</span><div><h2>Runtime Architecture</h2><p>Static client with direct BaaS integration. No custom server process.</p></div></header>
        <div className="architecture-map">
          <section className="architecture-layer architecture-layer--clients">
            <header><span>01</span><div><b>Client layer</b><small>Browsers at the party</small></div></header>
            <div className="architecture-client-grid">
              <article><i className="architecture-device architecture-device--phone" aria-hidden="true" /><div><h3>Guest devices</h3><p>Mobile browsers capture photos and submit ballots.</p></div></article>
              <article><i className="architecture-device architecture-device--tv" aria-hidden="true" /><div><h3>Presentation display</h3><p>TV browser runs the shared timer, QR entry point, and result reveal.</p></div></article>
            </div>
          </section>

          <div className="architecture-connector"><span>HTTPS</span></div>

          <section className="architecture-layer architecture-layer--app">
            <header><span>02</span><div><b>Application layer</b><small>GitHub Pages</small></div><em>STATIC</em></header>
            <div className="architecture-app-grid">
              <article><code>/</code><h3>Public landing page</h3><p>Party overview and direct calls to join the game.</p></article>
              <article><code>/play/</code><h3>React game client</h3><p>Camera, challenges, voting, and TV mode.</p></article>
              <article><code>/developer/*</code><h3>Developer workspace</h3><p>Architecture, database, security, operations, and project progress.</p></article>
            </div>
          </section>

          <div className="architecture-connector architecture-connector--sdk"><span>@supabase/supabase-js</span></div>

          <section className="architecture-services" aria-label="Supabase services">
            <article><span className="architecture-service-icon">AU</span><small>Identity</small><h3>Auth</h3><p>Anonymous JWT users with browser-persisted sessions.</p></article>
            <article><span className="architecture-service-icon">DB</span><small>Data</small><h3>Postgres</h3><p>REST, RPC, row-level security, and realtime changes.</p></article>
            <article><span className="architecture-service-icon">ST</span><small>Objects</small><h3>Storage</h3><p>Private photos bucket read through membership-gated authenticated downloads.</p></article>
          </section>
        </div>
        <div className="dev-facts">
          <article><h3>Deployment unit</h3><code>dist/</code><p>Immutable static assets deployed by GitHub Actions on pushes to main.</p></article>
          <article><h3>Public configuration</h3><code>VITE_SUPABASE_*</code><p>Project URL and publishable key identify the backend; neither grants privileged access.</p></article>
          <article><h3>Authorization boundary</h3><code>auth.uid() + membership + RLS</code><p>JWT identity, passphrase-gated party membership, and database policies authorize every table and object operation.</p></article>
        </div>
      </section>

      <section className="dev-section" id="flows">
        <header><span>02</span><div><h2>Request Flows</h2><p>Primary write and read paths initiated by the browser.</p></div></header>
        <div className="dev-table-wrap">
          <table className="dev-table">
            <thead><tr><th>Operation</th><th>Client entry point</th><th>Persistence path</th><th>Invariant</th></tr></thead>
            <tbody>{requestFlows.map((flow) => <tr key={flow[0]}>{flow.map((cell, index) => <td key={cell}>{index === 1 ? <code>{cell}</code> : cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export function DatabaseDesign() {
  return (
    <main className="developer-system">
      <ReferenceHeader path="/developer/db-design" title="DB Design" description="Public PostgreSQL tables and their Supabase Auth and Storage dependencies." />

      <nav className="dev-index" aria-label="Database design sections"><a href="#schema">01 Relational data model</a></nav>
      <section className="dev-section" id="schema">
        <header><span>01</span><div><h2>Relational Data Model</h2><p>Keys, constraints, relationships, and private photo object storage.</p></div></header>
        <div className="erd-scroll" tabIndex={0} aria-label="Scrollable entity relationship diagram">
          <figure className="erd-canvas">
            <figcaption className="visually-hidden">Relationships among Auth, public database tables, and the private photos storage bucket.</figcaption>
            <ul className="visually-hidden">
              <li>memberships.user_id references auth.users.id and is created only by the join_party passphrase function.</li>
              <li>party_settings holds the bcrypt passphrase hash and is_open switch; clients cannot read or write it.</li>
              <li>profiles.user_id references auth.users.id.</li>
              <li>submissions.user_id references profiles.user_id.</li>
              <li>submissions.challenge_id references challenges.id.</li>
              <li>votes.voter_id references profiles.user_id.</li>
              <li>votes.challenge_id references challenges.id.</li>
              <li>votes submission_id and challenge_id reference submissions id and challenge_id.</li>
              <li>submissions.storage_path identifies an object in the private photos storage bucket.</li>
              <li>original_versions records every immutable original path; submissions.original_path identifies only the current version.</li>
            </ul>
            <svg className="erd-links" viewBox="0 0 1180 880" aria-hidden="true">
              <path d="M 760 104 H 900" />
              <path d="M 420 104 H 370 V 416 H 400" />
              <path d="M 590 230 V 590" />
              <path d="M 400 380 H 660 V 358 H 800" />
              <path d="M 780 706 H 820 V 358 H 800" />
              <path d="M 400 344 H 465 V 668 H 430" />
              <path d="M 400 452 H 810 V 482 H 800" />
              <path className="erd-links__storage" d="M 220 488 V 690" />
            </svg>

            {schemaNodes.map((node) => (
              <article className="erd-card" key={node.name} style={node.position} aria-label={`${node.namespace}.${node.name}: ${node.description}`}>
                <header><span className="erd-table-icon" aria-hidden="true" /><div><small>{node.namespace}</small><h3>{node.name}</h3></div></header>
                <ul>
                  {node.fields.map((field) => (
                    <li key={field.name}>
                      <span className="erd-markers">
                        {field.flags.map((flag) => <abbr key={flag} className={`erd-flag erd-flag--${flag.toLowerCase()}`} title={flag === 'PK' ? 'Primary key' : flag === 'FK' ? 'Foreign key' : 'Unique'}>{flag}</abbr>)}
                        <i className="erd-required" title="Non-nullable" />
                      </span>
                      <code>{field.name}</code>
                      <span>{field.type}</span>
                    </li>
                  ))}
                </ul>
                {node.constraints.length > 0 && <footer>{node.constraints.map((constraint) => <code key={constraint}>{constraint}</code>)}</footer>}
              </article>
            ))}

            <article className="erd-card erd-card--external erd-auth" aria-label="Supabase Auth users table">
              <header><span className="erd-table-icon" aria-hidden="true" /><div><small>auth</small><h3>users</h3></div></header>
              <ul><li><span className="erd-markers"><abbr className="erd-flag erd-flag--pk" title="Primary key">PK</abbr><i className="erd-required" title="Non-nullable" /></span><code>id</code><span>uuid</span></li></ul>
            </article>

            <article className="erd-card erd-card--storage erd-storage" aria-label="Private Supabase Storage buckets">
              <header><span className="erd-bucket-icon" aria-hidden="true" /><div><small>storage</small><h3>photos + photo-originals</h3></div><b>PRIVATE</b></header>
              <p>Uploads use immutable game and original paths. Originals enter the ZIP; superseded derived JPEGs are host-cleaned separately.</p>
              <dl><div><dt>game copy key</dt><dd><code>{'{user_id}/{challenge_id}/{version}.jpg'}</code> → active <code>submissions.storage_path</code></dd></div><div><dt>original key</dt><dd><code>{'{challenge_id}/{user_id}/{version}.{ext}'}</code> → archive ledger; current → <code>submissions.original_path</code></dd></div></dl>
            </article>

            <div className="erd-legend" aria-label="Diagram legend">
              <span><abbr className="erd-flag erd-flag--pk">PK</abbr> Primary key</span>
              <span><abbr className="erd-flag erd-flag--fk">FK</abbr> Foreign key</span>
              <span><abbr className="erd-flag erd-flag--uq">UQ</abbr> Unique</span>
              <span><i className="erd-required" /> Non-nullable</span>
              <span><i className="erd-line-sample" /> Relationship</span>
            </div>
          </figure>
        </div>
      </section>
    </main>
  )
}

export function SecurityOps() {
  return (
    <main className="developer-system">
      <ReferenceHeader path="/developer/security-ops" title="Security and Ops" description="Authorization boundaries, privileged logic, source ownership, and deployment constraints." />

      <nav className="dev-index" aria-label="Security and operations sections"><a href="#security">01 Security</a><a href="#operations">02 Operations</a></nav>
      <section className="dev-section" id="security">
        <header><span>01</span><div><h2>Security Model</h2><p>Browser-visible credentials are non-privileged; enforcement resides in Postgres.</p></div></header>
        <div className="dev-grid">
          <article><h3>Authentication</h3><ul><li>Anonymous Auth issues an authenticated-role JWT.</li><li>Identity persists in browser storage.</li><li>Clearing storage creates a new user identity that must re-enter the passphrase.</li></ul></article>
          <article><h3>Party membership</h3><ul><li><code>join_party()</code> compares the passphrase to a bcrypt hash inside Postgres.</li><li>A wrong passphrase never creates a membership.</li><li>Every table, view, RPC, and Storage policy requires an active membership while <code>is_open</code> is true.</li></ul></article>
          <article><h3>Database RLS</h3><ul><li>All party tables require an active membership.</li><li>Profiles may only be inserted for <code>auth.uid()</code>.</li><li>Submission mutation requires ownership and zero existing votes.</li><li>Direct vote writes are denied; ballots use the RPC.</li></ul></article>
          <article><h3>Storage RLS</h3><ul><li>Both buckets are private.</li><li>Original uploads require an owned pending reservation with an exact path.</li><li>Participants have no original-delete policy; cleanup is host-only.</li><li>Reads require active party membership.</li></ul></article>
          <article><h3>Image delivery</h3><ul><li>Images are fetched with authenticated <code>storage.download()</code> calls.</li><li>The browser renders device-local blob URLs; no reusable signed URLs are issued.</li><li>Members can still save or photograph what their own screen displays.</li></ul></article>
          <article><h3>Privileged logic</h3><ul><li><code>submit_votes</code> derives voter ID from JWT and requires membership.</li><li>Original reservation and activation RPCs validate ownership, membership, object presence, and replacement eligibility.</li><li>Cleanup SQL and service-role keys never enter the client build.</li></ul></article>
        </div>
        <p className="dev-crosslink">Passphrase and party lifecycle commands live on the <a href={runbookPageUrl}>Host Password Runbook →</a></p>
      </section>

      <section className="dev-section" id="operations">
        <header><span>02</span><div><h2>Operational Reference</h2><p>Source ownership, capacity assumptions, and deployment path.</p></div></header>
        <div className="dev-table-wrap">
          <table className="dev-table">
            <tbody>
              <tr><th>Application orchestration</th><td><code>src/App.tsx</code></td><td>Auth bootstrap, realtime subscriptions, view selection</td></tr>
              <tr><th>Backend adapter</th><td><code>src/lib/api.ts</code></td><td>Typed table, RPC, Auth and Storage operations</td></tr>
              <tr><th>Image pipeline</th><td><code>src/lib/images.ts</code></td><td>Original preserved ≤6 MB (optimized above); adaptive 2400 px game JPEG</td></tr>
              <tr><th>Database definition</th><td><code>supabase/migrations/</code></td><td>DDL, RLS, RPC, views and seed data</td></tr>
              <tr><th>Deployment</th><td><code>.github/workflows/deploy.yml</code></td><td>Test → typecheck/build → Pages artifact</td></tr>
              <tr><th>Free-tier constraints</th><td><code>1 GB storage / 5 GB egress</code></td><td>Client compression is required to control object and transfer volume</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

const hostCommands = [
  {
    action: 'Set or rotate the passphrase',
    sql: "select set_party_passphrase('maple-otter-battery-42');",
    effect: 'Stores only the bcrypt hash. Any non-empty passphrase is accepted; longer phrases resist online guessing. Existing members stay in; only new joins need the new phrase.',
  },
  {
    action: 'Close the party',
    sql: 'update party_settings set is_open = false;',
    effect: 'Instantly blocks all database and Storage requests for everyone, including existing members. No redeploy needed.',
  },
  {
    action: 'Reopen the party',
    sql: 'update party_settings set is_open = true;',
    effect: 'Existing memberships resume working immediately.',
  },
  {
    action: 'Reset for a new party',
    sql: "delete from memberships;\nselect set_party_passphrase('next-party-phrase');",
    effect: 'Every browser must enter the new passphrase again before reading or writing anything.',
  },
]

export function CopySqlCell({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard access denied; leave the text selectable as a fallback.
    }
  }

  return (
    <div className="sql-copy">
      <code>{sql.split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</code>
      <button type="button" className="sql-copy__button" onClick={copy} title={copied ? 'Copied!' : 'Copy SQL to clipboard'} aria-label={copied ? 'Copied' : `Copy SQL: ${sql}`}>
        {copied ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 5 5L19 7" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9.5A1.5 1.5 0 0 1 10.5 8h8A1.5 1.5 0 0 1 20 9.5v10a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 9 19.5zM15 8V5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v10A1.5 1.5 0 0 0 5.5 17H9" /></svg>
        )}
      </button>
    </div>
  )
}

export function HostPasswordRunbook() {
  return (
    <main className="developer-system">
      <ReferenceHeader path="/developer/host-runbook" title="Host Password Runbook" description="Host-only controls for the party passphrase, the open/closed switch, and photo protection." />

      <nav className="dev-index" aria-label="Host runbook sections"><a href="#access-model">01 Access model</a><a href="#commands">02 Commands</a></nav>
      <section className="dev-section" id="access-model">
        <header><span>01</span><div><h2>Party Access Model</h2><p>How the passphrase, memberships, and image delivery protect party data.</p></div></header>
        <div className="dev-facts">
          <article><h3>Admission chain</h3><code>JWT → passphrase → membership → RLS</code><p>A guest signs in anonymously, submits the passphrase to join_party(), and receives a membership row tied to their browser identity. Only active memberships pass row-level security.</p></article>
          <article><h3>Passphrase handling</h3><code>bcrypt hash only</code><p>The plaintext passphrase is never stored in the repository, JavaScript bundle, QR code, or database. Share it out of band — say it aloud or write it on the board.</p></article>
          <article><h3>Raw image protection</h3><code>storage.download() → blob URL</code><p>Knowing the site URL, project URL, publishable key, bucket name, or object path is not sufficient to fetch image bytes. Each download is authorized per request against the membership policy.</p></article>
        </div>
      </section>

      <section className="dev-section" id="commands">
        <header><span>02</span><div><h2>Host Commands</h2><p>Run every command in the Supabase dashboard SQL editor — the dashboard login is the only privileged surface.</p></div></header>
        <div className="dev-table-wrap">
          <table className="dev-table">
            <thead><tr><th>Action</th><th>SQL editor command</th><th>Effect</th></tr></thead>
            <tbody>
              {hostCommands.map((command) => (
                <tr key={command.action}>
                  <th>{command.action}</th>
                  <td><CopySqlCell sql={command.sql} /></td>
                  <td>{command.effect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="dev-crosslink">Exporting and cleaning up full-resolution originals lives on the <a href={photoExportPageUrl}>Photo Export Runbook →</a></p>
    </main>
  )
}
