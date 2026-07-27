const tables = [
  {
    name: 'profiles',
    purpose: 'One party identity per anonymous browser user.',
    fields: [
      ['user_id', 'uuid · PK · FK auth.users'],
      ['display_name', 'text · unique, case-insensitive'],
      ['created_at', 'timestamptz'],
    ],
  },
  {
    name: 'challenges',
    purpose: 'The eight ordered photo prompts.',
    fields: [
      ['id', 'smallint · PK'],
      ['slug', 'text · unique'],
      ['title / prompt / kicker', 'text'],
      ['sort_order', 'smallint · unique'],
    ],
  },
  {
    name: 'submissions',
    purpose: 'One active photo from a guest for a challenge.',
    fields: [
      ['id', 'uuid · PK'],
      ['challenge_id', 'smallint · FK challenges'],
      ['user_id', 'uuid · FK profiles'],
      ['storage_path', 'text · unique'],
      ['created_at', 'timestamptz'],
    ],
  },
  {
    name: 'votes',
    purpose: 'Three distinct choices per voter and challenge.',
    fields: [
      ['voter_id', 'uuid · PK part · FK profiles'],
      ['challenge_id', 'smallint · PK part'],
      ['submission_id', 'uuid · PK part · FK submissions'],
      ['created_at', 'timestamptz'],
    ],
  },
]

const flows = [
  ['01', 'Join', 'signInAnonymously()', 'Supabase Auth returns a browser-persistent user ID, then the app inserts one profile.'],
  ['02', 'Upload', 'compressPhoto() → Storage', 'The browser resizes to 1800 px JPEG, uploads privately, then upserts the submission record.'],
  ['03', 'Vote', 'submit_votes()', 'A Postgres RPC validates exactly three distinct submissions and replaces that guest’s challenge votes atomically.'],
  ['04', 'Score', 'challenge_results → leaderboard', 'SQL ranks vote totals with competition ranking and awards 3, 2, or 1 point.'],
]

export function SystemDiagram({ onBack }: { onBack?: () => void }) {
  return (
    <div className="system-page">
      {onBack && <button className="tutorial-back" onClick={onBack}>← Back to setup</button>}
      <header className="system-hero">
        <span className="eyebrow">Architecture / data / trust boundaries</span>
        <h1>How the<br /><i>system flows.</i></h1>
        <p>A static React app talks directly to Supabase. There is no custom application server and no private credential in the browser.</p>
      </header>

      <section className="system-architecture">
        <span className="eyebrow">01 / Runtime architecture</span>
        <div className="architecture-flow">
          <article className="architecture-node architecture-node--clients">
            <small>Clients</small>
            <h2>Guest phones<br />+ party TV</h2>
            <p>Camera, voting controls, presentation view</p>
          </article>
          <span className="architecture-arrow">HTTP<br />→</span>
          <article className="architecture-node architecture-node--app">
            <small>GitHub Pages</small>
            <h2>React + Vite</h2>
            <p>Static HTML, CSS, JavaScript and public project configuration</p>
          </article>
          <span className="architecture-arrow">HTTPS<br />→</span>
          <article className="architecture-node architecture-node--supabase">
            <small>Supabase</small>
            <h2>Auth + Data<br />+ Photos</h2>
            <p>Anonymous JWTs, Postgres, RPC, realtime and private Storage</p>
          </article>
        </div>
        <pre className="system-ascii" aria-label="Text version of runtime architecture">{`╔══════════════╗      ┌──────────────────┐      ╔══════════════════╗
║ GUEST + TV   ║ HTTP │ GITHUB PAGES     │ HTTPS║ SUPABASE         ║
║ Browser UI   ╟─────►│ React / Vite     ├─────►║ Auth / DB / Files║
╚══════════════╝      └──────────────────┘      ╚══════════════════╝`}</pre>
      </section>

      <section className="system-section">
        <header className="system-section__heading">
          <span className="eyebrow">02 / Request paths</span>
          <h2>Four journeys through the app.</h2>
        </header>
        <div className="system-flows">
          {flows.map(([number, title, code, description]) => (
            <article key={number}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <code>{code}</code>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="system-section">
        <header className="system-section__heading">
          <span className="eyebrow">03 / Relational model</span>
          <h2>Tables and their connections.</h2>
        </header>
        <pre className="schema-map" aria-label="Database relationship diagram">{`┌────────────┐  1:1  ┌──────────┐  1:N  ┌─────────────┐  N:1  ┌────────────┐
│ auth.users │──────►│ profiles │──────►│ submissions │◄──────│ challenges │
└────────────┘       └────┬─────┘       └──────┬──────┘       └─────┬──────┘
                          │ 1:N                │ N:1                  │ 1:N
                          └────────────►┌───────┴──┐◄─────────────────┘
                                       │  votes   │
                                       └──────────┘`}</pre>
        <div className="schema-grid">
          {tables.map((table) => (
            <article className="schema-card" key={table.name}>
              <header>
                <span>TABLE</span>
                <h3>{table.name}</h3>
                <p>{table.purpose}</p>
              </header>
              <dl>
                {table.fields.map(([field, type]) => (
                  <div key={field}>
                    <dt>{field}</dt>
                    <dd>{type}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="system-services">
        <article>
          <span className="eyebrow">Private object storage</span>
          <h3>photos/{'{user_id}'}/{'{challenge_id}'}.jpg</h3>
          <p>JPEG only, 5 MB object limit, signed one-hour read URLs. Guests upload only inside their own user folder.</p>
        </article>
        <article>
          <span className="eyebrow">Computed database API</span>
          <h3>challenge_results + leaderboard</h3>
          <p>Views aggregate vote counts, rank each challenge, attribute points to photographers, and total the final standings.</p>
        </article>
        <article>
          <span className="eyebrow">Security model</span>
          <h3>JWT + row-level security</h3>
          <p>The publishable key identifies the project. Anonymous JWT identity and Postgres policies decide what each guest can read or change.</p>
        </article>
      </section>

      <section className="system-files">
        <span className="eyebrow">04 / Source map</span>
        <div>
          <code>src/App.tsx</code><span>Authentication, realtime and screen orchestration</span>
          <code>src/lib/api.ts</code><span>Typed Supabase operations</span>
          <code>src/lib/images.ts</code><span>Client-side image preparation</span>
          <code>supabase/migrations/001_initial.sql</code><span>Schema, policies, RPC and scoring views</span>
          <code>.github/workflows/deploy.yml</code><span>Test, build and GitHub Pages deployment</span>
        </div>
      </section>
    </div>
  )
}
