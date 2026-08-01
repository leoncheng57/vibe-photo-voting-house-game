# AGENTS.md

## Project

House Party Photo Hunt is a mobile-first party photo challenge. The frontend is React 19, TypeScript, and Vite. Supabase provides anonymous authentication, PostgreSQL, private photo storage, row-level security, RPCs, and realtime updates. The static site is deployed to GitHub Pages; there is no application server.

## Repository Map

- `src/App.tsx`: authentication, passphrase gate, profile setup, navigation, and realtime subscriptions
- `src/components/`: guest, voting, leaderboard, tutorial, timer, developer palette, and TV views
- `src/lib/api.ts`: browser-side Supabase queries, dual-bucket uploads, membership RPCs, authenticated photo downloads, storage-usage RPC, and vote RPC calls
- `src/lib/images.ts`: browser photo pipeline — original preservation/optimization plus the 2400 px game JPEG
- `src/lib/photo-policy.ts`: pure size thresholds, encode ladders, export naming, and storage meter math (unit tested)
- `src/lib/zip.ts`: dependency-free store-only ZIP writer for the originals export (unit tested)
- `src/lib/scoring.ts`: client-side podium and leaderboard helpers
- `src/types.ts`: shared application types
- `src/styles.css`: main application styles and responsive behavior
- `src/developer-system.tsx` and `src/developer-system.css`: developer system reference page
- `src/developer-progress.tsx` and `src/developer-repository-files.tsx`: live GitHub progress and repository documentation pages
- `SCREENSHOT_CAPTURE_PLAN.md`: privacy-safe automated documentation screenshot workflow
- `docs/images/app-icon.svg`: hand-authored project icon and source of truth; `docs/images/app-icon.png` is the rendered copy used in the README. Unlike the rest of `docs/images/`, these are not captured screenshots — regenerate the PNG from the SVG with `rsvg-convert -w 256 -h 256 docs/images/app-icon.svg -o docs/images/app-icon.png`
- `supabase/migrations/`: database schema, policies, views, functions, and data migrations
- `scripts/backfill-legacy-originals.mjs`: one-time service-role backfill adopting pre-archive game copies as `legacy` originals
- `index.html` is the public landing entry, `play/index.html` is the game, `home/index.html` redirects legacy links, and the pages under `developer/` (palette, system, db-design, security-ops, run-of-show, host-runbook, photo-export, github-progress, repository-files) are developer references; the Developer nav link lands on GitHub project progress
- `.github/workflows/deploy.yml`: GitHub Pages deployment

## Commands

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
npm run preview
```

Run tests, lint, and build before considering a change complete.

## Architecture And Data Invariants

- Anonymous Supabase sessions persist in the browser. A profile is keyed by the authenticated user's UUID.
- Party access is passphrase-gated. `public.join_party()` validates the passphrase against a bcrypt hash in `public.party_settings` and creates a `public.memberships` row; every table, view, RPC, and Storage policy requires `public.is_member()`, which also checks the `is_open` switch. Never store or log the plaintext passphrase, and never weaken a policy below active membership.
- The join order is fixed: anonymous sign-in, then passphrase membership, then profile creation. Profile inserts fail without membership.
- Each guest may have at most one submission per challenge.
- Migrated game-copy keys may be `{user_id}/{challenge_id}.jpg`; new immutable game copies use `{user_id}/{challenge_id}/{version}.jpg`. `submissions.storage_path` points to the active copy.
- Original keys are `{challenge_id}/{user_id}/{version}.{ext}` in `photo-originals`. `public.original_versions` is the append-only ledger for current, superseded, and stored pending revisions; `submissions.original_path` points only to the active revision. Participant code and Storage policies must never delete originals.
- Uploads reserve ledger metadata before writing bytes, upload immutable original and game paths, then activate the revision through `activate_original_version()`. Failed steps leave original bytes represented for host recovery/export rather than deleting them.
- Historical game JPEGs are derived copies, excluded from the originals ZIP, and may be deleted only by the host after querying unreferenced `original_versions.game_path` values. Participants have no Storage update/delete policies.
- Host cleanup approves ledger rows and clears `submissions.original_*` first, then deletes bucket objects, then tombstones missing approved versions — never reverse that order. The flow lives on `/developer/photo-export/`.
- The `photos` bucket is private. The app fetches image bytes with authenticated `storage.download()` calls and renders browser-local blob URLs; do not reintroduce reusable signed URLs. Blob URLs are cached per `storage_path` in `src/lib/api.ts` and must be invalidated when a submission changes, because photo replacement reuses the same path.
- Storage objects and `public.submissions` rows do not cascade to each other. Never document or implement storage-only cleanup for a referenced photo.
- Upload is not transactional across Storage and Postgres. Pending ledger rows and physically stored recovery copies are intentional failure records, not participant-cleaned orphans.
- Delete a submission before deleting its Storage object. Votes referencing that submission cascade automatically.
- Existing voted submissions cannot be replaced or deleted by participants under the current policies.
- Voting submits submission IDs plus the immutable game paths the voter saw; the RPC locks and rejects stale paths so replacement cannot race with ballot creation.
- Realtime subscriptions cover `submissions` and `votes`, not Storage changes.
- The timer is informational and device-local. It does not lock uploads or voting.
- Apply Supabase migrations in numeric order. Add a new migration for schema changes; do not rewrite migrations that may already have been applied.

## Editing Rules

- Prefer the smallest correct change and preserve the existing visual language.
- Keep guest flows usable on phones and TV mode usable on large displays.
- Keep Supabase access in `src/lib/api.ts` unless there is a clear architectural reason to move it.
- Preserve row-level security and validate both ownership and cross-user read behavior when changing Supabase code.
- Never commit `.env`, `.env.local`, service-role keys, access tokens, private photos, or production guest data.
- Do not edit or commit generated output in `dist/`, `.vite/`, or `node_modules/`.
- Add or update tests for non-trivial scoring or data transformation behavior.
- Update README operational guidance whenever setup, migrations, deployment, or cleanup behavior changes.

## GitHub Issue Triage

- Assign every open issue exactly one priority label. Priority is separate from category labels such as `bug`, `frontend`, `security`, or `storage`.
- Use `priority: high` for blocking work, security or privacy exposure, data-loss risk, event-blocking failures, or work required before the next committed event or release.
- Use `priority: medium` for important planned features, usability work, and maintenance that has clear near-term value.
- Use `priority: low` for optional, cosmetic, or exploratory improvements that can wait without meaningful risk.
- Keep priority in labels, not title prefixes such as `[HIGH]` or `[MED]`.
- Update the priority label when urgency changes rather than adding a second priority.

## Validation

```bash
npm test
npm run lint
npm run build
```

For UI changes, inspect relevant guest views at mobile width and TV mode at desktop width. For Supabase changes, verify migrations against a disposable project and test the affected RLS policies.
