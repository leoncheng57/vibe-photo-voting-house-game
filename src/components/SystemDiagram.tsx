const tables = [
  {
    name: 'profiles',
    description: 'Party identity associated with an anonymous Auth user.',
    constraints: 'PK (user_id), UNIQUE (lower(trim(display_name)))',
    fields: [
      ['user_id', 'uuid', 'NOT NULL', 'FK → auth.users.id ON DELETE CASCADE'],
      ['display_name', 'text', 'NOT NULL', '2–24 trimmed characters'],
      ['created_at', 'timestamptz', 'NOT NULL', 'DEFAULT now()'],
    ],
  },
  {
    name: 'challenges',
    description: 'Ordered catalog of six photo prompts.',
    constraints: 'PK (id), UNIQUE (slug), UNIQUE (sort_order)',
    fields: [
      ['id', 'smallint', 'NOT NULL', 'Primary key'],
      ['slug', 'text', 'NOT NULL', 'Stable identifier'],
      ['title', 'text', 'NOT NULL', 'Display title'],
      ['prompt', 'text', 'NOT NULL', 'Challenge instructions'],
      ['kicker', 'text', 'NOT NULL', 'Short display copy'],
      ['sort_order', 'smallint', 'NOT NULL', 'Presentation order'],
    ],
  },
  {
    name: 'submissions',
    description: 'Single active photo submitted by a user to a challenge.',
    constraints: 'PK (id), UNIQUE (challenge_id, user_id), UNIQUE (storage_path)',
    fields: [
      ['id', 'uuid', 'NOT NULL', 'DEFAULT gen_random_uuid()'],
      ['challenge_id', 'smallint', 'NOT NULL', 'FK → challenges.id'],
      ['user_id', 'uuid', 'NOT NULL', 'FK → profiles.user_id ON DELETE CASCADE'],
      ['storage_path', 'text', 'NOT NULL', '{user_id}/{challenge_id}.jpg'],
      ['created_at', 'timestamptz', 'NOT NULL', 'DEFAULT now()'],
    ],
  },
  {
    name: 'votes',
    description: 'One selected submission within a voter’s three-choice ballot.',
    constraints: 'PK (voter_id, challenge_id, submission_id)',
    fields: [
      ['voter_id', 'uuid', 'NOT NULL', 'FK → profiles.user_id ON DELETE CASCADE'],
      ['challenge_id', 'smallint', 'NOT NULL', 'FK → challenges.id'],
      ['submission_id', 'uuid', 'NOT NULL', 'Composite FK → submissions'],
      ['created_at', 'timestamptz', 'NOT NULL', 'DEFAULT now()'],
    ],
  },
]

const requestFlows = [
  ['Identity bootstrap', 'supabase.auth.signInAnonymously()', 'auth.users → profiles', 'Persistent JWT session scoped to one browser.'],
  ['Photo submission', 'compressPhoto() + storage.upload()', 'photos bucket → submissions', 'JPEG, max 1800 px client-side; metadata upsert follows object write.'],
  ['Ballot write', 'rpc(\'submit_votes\')', 'submissions → votes', 'SECURITY DEFINER function requires min(3, available submissions) distinct IDs and writes atomically.'],
  ['Result query', 'challenge_results + leaderboard', 'votes → ranked views', 'Postgres rank() implements competition ranking; podium points are 3/2/1.'],
]

export function SystemDiagram() {
  return (
    <main className="developer-system">
      <header className="dev-header">
        <div>
          <code>/developer/system</code>
          <h1>Photo Hunt System Reference</h1>
          <p>Runtime architecture, trust boundaries, persistence model, and operational constraints.</p>
        </div>
        <dl>
          <div><dt>frontend</dt><dd>React 19 / Vite 7</dd></div>
          <div><dt>backend</dt><dd>Supabase</dd></div>
          <div><dt>hosting</dt><dd>GitHub Pages</dd></div>
          <div><dt>revision</dt><dd>schema v2</dd></div>
        </dl>
      </header>

      <nav className="dev-index" aria-label="System reference sections">
        <a href="#architecture">01 Architecture</a>
        <a href="#flows">02 Request flows</a>
        <a href="#schema">03 Data model</a>
        <a href="#security">04 Security</a>
        <a href="#operations">05 Operations</a>
      </nav>

      <section className="dev-section" id="architecture">
        <header><span>01</span><div><h2>Runtime Architecture</h2><p>Static client with direct BaaS integration. No custom server process.</p></div></header>
        <pre className="dev-diagram">{`┌──────────────────────────────────────────────────────────────────────────────┐
│ CLIENTS                                                                      │
│ Guest mobile browsers                     TV presentation browser            │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ GITHUB PAGES                                                                 │
│ React SPA                  /developer/system static entry                    │
│ camera · voting · display  architecture reference                           │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │ @supabase/supabase-js
               ┌───────────────┼───────────────────┐
               ▼               ▼                   ▼
┌──────────────────────┐ ┌──────────────────┐ ┌───────────────────────────────┐
│ AUTH                 │ │ POSTGRES         │ │ STORAGE                       │
│ anonymous JWT users  │ │ REST · RPC · RLS │ │ private photos bucket         │
│ browser persistence  │ │ Realtime changes │ │ signed read URLs (1 hour)     │
└──────────────────────┘ └──────────────────┘ └───────────────────────────────┘`}</pre>
        <div className="dev-facts">
          <article><h3>Deployment unit</h3><code>dist/</code><p>Immutable static assets deployed by GitHub Actions on pushes to main.</p></article>
          <article><h3>Public configuration</h3><code>VITE_SUPABASE_*</code><p>Project URL and publishable key identify the backend; neither grants privileged access.</p></article>
          <article><h3>Authorization boundary</h3><code>auth.uid() + RLS</code><p>JWT identity and database policies authorize every table and object operation.</p></article>
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

      <section className="dev-section" id="schema">
        <header><span>03</span><div><h2>Relational Data Model</h2><p>PostgreSQL tables in the public schema and their Auth dependency.</p></div></header>
        <pre className="dev-diagram dev-diagram--compact">{`auth.users  1 ───── 1  profiles  1 ───── N  submissions  N ───── 1  challenges
                          │                      │                         │
                          │ 1                    │ N                       │ 1
                          └──────── N  votes  N ─┴─────────────────────────┘

votes.(submission_id, challenge_id) → submissions.(id, challenge_id)`}</pre>
        <div className="dev-schema-list">
          {tables.map((table) => (
            <article key={table.name}>
              <header><div><code>public.{table.name}</code><p>{table.description}</p></div><small>{table.constraints}</small></header>
              <div className="dev-table-wrap">
                <table className="dev-table dev-table--schema">
                  <thead><tr><th>Column</th><th>Type</th><th>Nullability</th><th>Constraint / semantic</th></tr></thead>
                  <tbody>{table.fields.map((field) => <tr key={field[0]}>{field.map((cell, index) => <td key={cell}>{index === 0 ? <code>{cell}</code> : cell}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dev-section" id="security">
        <header><span>04</span><div><h2>Security Model</h2><p>Browser-visible credentials are non-privileged; enforcement resides in Postgres.</p></div></header>
        <div className="dev-grid">
          <article><h3>Authentication</h3><ul><li>Anonymous Auth issues an authenticated-role JWT.</li><li>Identity persists in browser storage.</li><li>Clearing storage creates a new user identity.</li></ul></article>
          <article><h3>Database RLS</h3><ul><li>Profiles may only be inserted for <code>auth.uid()</code>.</li><li>Submission mutation requires ownership and zero existing votes.</li><li>Direct vote writes are denied; ballots use the RPC.</li></ul></article>
          <article><h3>Storage RLS</h3><ul><li>Bucket is private and JPEG-only.</li><li>Uploads are restricted to the user ID prefix.</li><li>Reads require a valid participant profile.</li></ul></article>
          <article><h3>Privileged logic</h3><ul><li><code>submit_votes</code> derives voter ID from JWT.</li><li>Required choices equal <code>min(3, available submissions)</code>.</li><li>Service-role keys never enter the client build.</li></ul></article>
        </div>
      </section>

      <section className="dev-section" id="operations">
        <header><span>05</span><div><h2>Operational Reference</h2><p>Source ownership, capacity assumptions, and deployment path.</p></div></header>
        <div className="dev-table-wrap">
          <table className="dev-table">
            <tbody>
              <tr><th>Application orchestration</th><td><code>src/App.tsx</code></td><td>Auth bootstrap, realtime subscriptions, view selection</td></tr>
              <tr><th>Backend adapter</th><td><code>src/lib/api.ts</code></td><td>Typed table, RPC, Auth and Storage operations</td></tr>
              <tr><th>Image pipeline</th><td><code>src/lib/images.ts</code></td><td>Canvas resize to 1800 px; JPEG quality 0.82</td></tr>
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
