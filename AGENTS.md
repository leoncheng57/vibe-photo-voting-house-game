# AGENTS.md

## Project

House Party Photo Hunt is a mobile-first party photo challenge. The frontend is React 19, TypeScript, and Vite. Supabase provides anonymous authentication, PostgreSQL, private photo storage, row-level security, RPCs, and realtime updates. The static site is deployed to GitHub Pages; there is no application server.

## Repository Map

- `src/App.tsx`: authentication, passphrase gate, profile setup, navigation, and realtime subscriptions
- `src/components/`: guest, voting, leaderboard, tutorial, timer, palette, and TV views
- `src/lib/api.ts`: browser-side Supabase queries, dual-bucket uploads, membership RPCs, authenticated photo downloads, storage-usage RPC, and vote RPC calls
- `src/lib/images.ts`: browser photo pipeline — original preservation/optimization plus the 2400 px game JPEG
- `src/lib/photo-policy.ts`: pure size thresholds, encode ladders, export naming, and storage meter math (unit tested)
- `src/lib/zip.ts`: dependency-free store-only ZIP writer for the originals export (unit tested)
- `src/lib/scoring.ts`: client-side podium and leaderboard helpers
- `src/types.ts`: shared application types
- `src/styles.css`: main application styles and responsive behavior
- `src/developer-system.tsx` and `src/developer-system.css`: developer system reference page
- `SCREENSHOT_CAPTURE_PLAN.md`: privacy-safe automated documentation screenshot workflow
- `PARTY_PHASES.md`: host and guest event phases, transitions, storage checks, and hotfix protocol
- `supabase/migrations/`: database schema, policies, views, functions, and data migrations
- `scripts/backfill-legacy-originals.mjs`: one-time service-role backfill adopting pre-archive game copies as `legacy` originals
- `index.html`, `home/index.html`, and the pages under `developer/` (system, db-design, security-ops, host-runbook, photo-export, github-progress): Vite entry points; the Developer nav link lands on GitHub project progress
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
- Game-copy photo keys must be `{user_id}/{challenge_id}.jpg`. This convention is enforced by `public.submissions.storage_path`.
- Original photo keys must be `{challenge_id}/{user_id}/{version}.{ext}` in the private `photo-originals` bucket, referenced by `public.submissions.original_path`. Originals are never overwritten: replacements upload a new versioned object, update the row, then remove the superseded object. Originals at or below 6 MiB are preserved byte-for-byte; larger or non-HEIC/JPEG captures are processed client-side. `original_status` records provenance: `exact`, `optimized` (full-res re-encode), `resized`, or `legacy` (pre-archive game copy adopted via `scripts/backfill-legacy-originals.mjs`).
- Host cleanup of exported originals clears `original_*` columns first, then empties the bucket — never the reverse. The flow lives on `/developer/photo-export/`.
- The `photos` bucket is private. The app fetches image bytes with authenticated `storage.download()` calls and renders browser-local blob URLs; do not reintroduce reusable signed URLs. Blob URLs are cached per `storage_path` in `src/lib/api.ts` and must be invalidated when a submission changes, because photo replacement reuses the same path.
- Storage objects and `public.submissions` rows do not cascade to each other. Never document or implement storage-only cleanup for a referenced photo.
- Upload is not transactional: the object is uploaded before the submission row is upserted. Account for possible orphaned objects or dangling database rows when changing this flow.
- Delete a submission before deleting its Storage object. Votes referencing that submission cascade automatically.
- Existing voted submissions cannot be replaced or deleted by participants under the current policies.
- Voting uses submission IDs and can continue to count a database submission even if its object is missing.
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
