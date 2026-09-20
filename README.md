# House Party Photo Hunt

<p align="center">
  <img src="docs/images/app-icon.png" width="128" alt="House Party Photo Hunt icon: a navy camera on a light blue rounded square">
</p>

A mobile-first housewarming photo challenge with passphrase-gated entry, anonymous guest profiles, direct photo uploads, up-to-three-vote rounds, TV presentation mode, optional Spotify playback, and a live total-vote leaderboard.

The frontend is React, TypeScript, and Vite on GitHub Pages. Supabase provides anonymous authentication, PostgreSQL, private photo storage, and realtime updates. No application server or Vercel deployment is required.

**[Try the live demo](https://leoncheng.dev/vibe-photo-voting-house-game/)**

## Screenshots

### Guest experience

<p align="center">
  <img src="docs/images/challenges-mobile.png" width="320" alt="Mobile challenge list showing photo prompts and upload controls">
  <img src="docs/images/voting-mobile.png" width="320" alt="Mobile voting view showing the anonymous photo selection experience">
</p>

### TV mode

![Desktop TV mode showing a challenge presentation and QR join code](docs/images/tv-mode-desktop.png)

### Leaderboard

![Desktop leaderboard showing synthetic player names, challenge wins, and total votes](docs/images/leaderboard-desktop.png)

### Developer reference

![Desktop developer system reference showing architecture documentation and navigation](docs/images/developer-system-desktop.png)

![Desktop developer palette showing the House Photo Hunt color system](docs/images/developer-palette-desktop.png)

### GitHub project priorities

![Desktop GitHub project progress dashboard with issues grouped by high, medium, and low priority](docs/images/github-priority-groups.png)

## Features

- Passphrase-gated party membership enforced by Postgres row-level security
- Six included housewarming photo challenges
- One replaceable photo per guest per challenge; replacing a voted photo requires confirmation and clears its votes
- In-browser photo resizing before upload
- Zero to three equal votes for distinct photos; saved ballots can be cleared and self-voting is allowed
- TV-only leaderboard ranked by total votes received, with competition ranking for ties
- Host-configurable appearance and winner mode, stored in the database and gated by a host PIN
- Informational, device-local timer configured from TV mode
- Optional Spotify Premium playback in TV mode through a resizable Spotify Connect player
- Built-in tutorial walkthrough for first-time guests
- Per-app palettes: House Photo Hunt is navy and pool blue, Outdoor Birthday Hunt is springtime plum and moss, and the pages they share (the front page, developer references and legacy redirects) are neutral grey
- Developer references for the color palette, architecture, database design, security and operations, repository files, and GitHub project progress, plus run-of-show, host password, and photo export runbooks under `/developer/`
- Anonymous photographer names during voting
- TV mode with a newest-first two-row scrolling Gallery, challenge-by-challenge Voting, protected challenge-winner reveals, How to Play, QR join codes, keyboard navigation, full-photo previews, and a host-confirmed final scoreboard
- Full-resolution HEIC/JPEG originals preserved alongside optimized game copies
- Always-visible storage meter against the Supabase Free 1 GB quota
- One-click originals export to a local ZIP (folder per challenge) with a pre-download tree preview on the Photo Export Runbook page
- Responsive layout for phones, laptops, and large televisions

The public landing page is served at `/`. Guests play at `/play/`; legacy `/home/` links redirect to the matching game view.
Primary views are deep-linkable at `/play/`, `/play/?tutorial`, `/play/?vote`, and `/play/?display`; in-app navigation keeps the address bar and browser Back/Forward history synchronized.

## Supabase Setup

1. Create a project on [Supabase](https://supabase.com/).
2. Open **Authentication > Providers > Anonymous Sign-Ins** and enable anonymous sign-ins. This is mandatory: `signInAnonymously()` is the app's only authentication path, and nothing works without it.
3. Apply the migrations in `supabase/migrations/` once, in numeric order. Either:
   - **Supabase CLI (preferred):** `supabase login`, `supabase link --project-ref <your-ref>`, then `supabase db push`. If earlier migrations were ever applied by hand, first baseline them with `supabase migration repair --status applied <versions>`.
   - **SQL Editor:** paste and run each file once, in numeric order:
     - `supabase/migrations/001_initial.sql`
     - `supabase/migrations/002_remove_challenges.sql`
     - `supabase/migrations/003_flexible_vote_count.sql`
     - `supabase/migrations/004_party_membership.sql`
     - `supabase/migrations/005_relax_passphrase_length.sql`
     - `supabase/migrations/006_photo_originals.sql`
     - `supabase/migrations/007_original_status.sql`
     - `supabase/migrations/008_allow_partial_ballots.sql`
     - `supabase/migrations/009_preserve_original_versions.sql`
     - `supabase/migrations/010_remove_legacy_submission_path_check.sql`
     - `supabase/migrations/011_interactive_original_cleanup.sql`
     - `supabase/migrations/012_total_vote_scoring.sql`
     - `supabase/migrations/013_allow_empty_ballots.sql`
     - `supabase/migrations/014_replace_voted_photos.sql`
     - `supabase/migrations/015_game_settings.sql`

   The `photos` and `photo-originals` buckets and every Storage policy are created by these migrations (001, 006, 009, and 011). Do not create buckets by hand in the dashboard; a hand-made bucket will not carry the row-level security the app depends on.

4. Set the party passphrase in the SQL Editor. Nobody can join until this runs:

```sql
select set_party_passphrase('your-long-passphrase');
```

5. Set the host PIN in the SQL Editor. Game settings cannot be changed until this runs:

```sql
select set_host_pin('your-host-pin');
```

6. Open **Project Settings > API** and copy the project URL and publishable key.
7. Copy `.env.example` to `.env` and fill in the Supabase public values:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
VITE_SPOTIFY_CLIENT_ID=your_optional_spotify_client_id
```

Migration 015 adds no environment variable. Appearance and winner mode live in the database, and the host PIN that guards them is bcrypt-hashed in Postgres — neither belongs in `.env` or in GitHub.

The publishable key is designed for browser use. Never add a Supabase secret key or service-role key to this repository or the frontend environment.

Supabase limits anonymous sign-ups by IP; if the party will exceed 30 guests on one network, review the Auth rate limit before the event.

## Guest Identity And Display Names

Each guest identity belongs to one browser profile. Returning in the same browser keeps the same identity, submissions, and votes. Changing the display name updates that existing profile; it does not create a new guest or disconnect any game data.

Display names are unique after trimming spaces and ignoring letter case. For example, `Leon`, ` leon `, and `LEON` are treated as the same name. If another guest already uses that name, the app shows `That name is already taken.`

A separate guest needs a different browser or browser profile. Another tab or window in the same browser shares the existing identity. Clearing site data, logging out and leaving the party, changing devices, or using another browser creates a new anonymous identity that must re-enter the passphrase and choose an available name; the previous identity's submissions and votes remain in the game.

## Party Access

Guests must enter a shared passphrase before they can read or write anything, including photo bytes. The passphrase is validated inside Postgres against a bcrypt hash; the plaintext is never stored in the repository, JavaScript bundle, QR code, or database. Share it out of band — say it aloud or write it on a board at the party.

Host controls (run in the Supabase SQL Editor; the full runbook is on `/developer/host-runbook/`):

```sql
select set_party_passphrase('maple-otter-battery-42');  -- set or rotate (any non-empty value)
update party_settings set is_open = false;              -- close the party instantly
update party_settings set is_open = true;               -- reopen
delete from memberships;                                -- reset: everyone re-enters the passphrase
```

Rotating the passphrase does not remove existing members; deleting memberships does. Closing the party blocks all database and Storage requests immediately, including for existing members, without redeploying the site.

## Game Settings

Appearance and winner mode are stored on the single-row `party_settings` table and shared by every device; they are not per-browser preferences. Any member can read them, but changing them requires the host PIN set during setup.

- **Theme** is the nine-token palette in `src/config/settings-defaults.ts` (`ink`, `sky`, `pool`, `powder`, `ice`, `paper`, `alert`, `accentBlue`, `accentGreen`). Stored tokens override the defaults at runtime; anything left unset falls back to the shipped purple palette.
- **Winner mode** is either `voting` (the top-voted photo wins a challenge) or `random` (a uniform draw over that challenge's entrants). The database rejects any other value.

The host PIN follows exactly the same rules as the party passphrase: it is bcrypt-hashed inside Postgres, never stored in the repository, JavaScript bundle, environment file, URL, or log, and is set or rotated only from the SQL Editor.

```sql
select set_host_pin('your-host-pin');   -- set or rotate; empty values are rejected
```

Rotating the PIN takes effect immediately and does not affect memberships, submissions, or votes. If `set_host_pin` has never run, settings changes fail with `No host PIN is set.` — guests can still play; only the settings screen is locked.

## Sharing The Project With A Collaborator

To let a co-host help run the party from the Supabase dashboard:

1. Open **Project Settings > Team** in the Supabase dashboard and invite them by email.
2. Grant the lowest role that lets them do their job. Read-only access is enough for watching storage and row counts; a co-host who must run the SQL Editor runbooks — rotating the passphrase, setting the host PIN, closing the party, approving photo cleanup — needs write access to the project.
3. Share the party passphrase and the host PIN out of band, in conversation or on a board at the party. Never commit either one, put them in `.env`, paste them into an issue or a URL query string, or send them through the repository.
4. The service-role key and any Supabase secret key never leave the host. They are not needed to play, to host, or to run any runbook in this README; the only script that uses one is `scripts/backfill-legacy-originals.mjs`, run locally by the host.
5. Collaborators who only need to deploy the site need repository access, not Supabase access. The publishable key and project URL are already safe to share as repository secrets.


## Local Development

```bash
npm install
npm run dev
```

Spotify rejects `localhost` redirect URIs. To test Spotify locally, run `npm run dev -- --host 127.0.0.1` and open <http://127.0.0.1:5173/play/?display>.

Validation commands:

```bash
npm test
npm run lint
npm run build
```

See [`SCREENSHOT_CAPTURE_PLAN.md`](SCREENSHOT_CAPTURE_PLAN.md) for the privacy-safe, automated README screenshot workflow.

Run all three locally before opening a pull request. Continuous integration runs only on pushes to `main`, and that workflow runs `npm test` and `npm run build` but not `npm run lint`. Pull requests trigger no checks at all, so a pull request with no red marks has not been verified by anything.

## GitHub Pages Deployment

1. In the GitHub repository, open **Settings > Secrets and variables > Actions**.
2. Add repository secrets named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. If Spotify playback is enabled, add a repository variable named `VITE_SPOTIFY_CLIENT_ID`. The Client ID is public; never add the Spotify Client Secret.
4. Open **Settings > Pages** and select **GitHub Actions** as the source.
5. Push to `main`, or manually run the **Deploy to GitHub Pages** workflow.

The app deploys to:

<https://leoncheng.dev/vibe-photo-voting-house-game/>

## Spotify TV Playback

Spotify playback is optional and appears only in TV mode. It uses Spotify Authorization Code with PKCE and the Web Playback SDK entirely in the browser. The Spotify Client Secret is not used. Access and refresh tokens stay in that browser's local storage and never enter Supabase, GitHub, application URLs, or logs. Disconnecting Spotify clears those tokens. Spotify refresh tokens currently expire after 180 days, after which the host must reconnect.

Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), enable **Web API** and **Web Playback SDK**, and register these exact redirect URIs:

```text
http://127.0.0.1:5173/play/
https://leoncheng.dev/vibe-photo-voting-house-game/play/
```

The Spotify app owner and playback account need an eligible Spotify Premium subscription. Development Mode apps support a limited authorized-user allowlist; add a non-owner playback account under **User Management** before testing it. The player requests `streaming`, `user-read-email`, and `user-read-private` for Web Playback SDK access, plus `user-read-playback-state` and `user-modify-playback-state` for Spotify Connect transfer and control.

In TV mode, select **Connect Spotify**, approve access, and then select **Play on TV**. The explicit second action satisfies browser autoplay rules and transfers the account's current playback to a Spotify Connect device named **House Photo Hunt TV**. If no playback context exists, start a song in the official Spotify app and try again. Once active, the expanded player provides previous, play/pause, next, and volume controls, while **Minimize** reduces it to a thin track-title bar that can be selected to restore the player. The official app on another device can still select songs, manage the queue, and control the TV browser.

The Web Playback SDK is for eligible noncommercial integrations. Music playback remains independent of photo gallery movement and transitions; do not synchronize Spotify content to the slideshow.

## Party Flow

1. Put the `/play/` URL or TV mode QR code where guests can find it, and share the party passphrase out of band.
2. Each guest enters the passphrase, then a unique display name, and takes one photo for every challenge. The TV device enters the passphrase once too.
3. Start the informational timer on the display device. It does not lock app actions.
4. During photo time, leave TV **Gallery** open as a newest-first two-row photo wall; it scrolls horizontally and labels every photo with its challenge.
5. When photo time ends, open TV **Voting** and move through one challenge at a time. Guests select up to three photos on their phones, may revisit a saved ballot, and can confirm zero votes to clear every prior choice.
6. After each round, hold **Reveal challenge winner** until the progress fill completes to show that challenge's winning photo or tied photos.
7. Continue through all challenges, then use the robot button in the TV Voting footer and confirm the host prompt to reveal final scores. The overall winner is the guest with the most votes received across every challenge.

Use the left and right arrow keys in TV Voting to switch challenges. Interacting with Gallery pauses its automatic movement temporarily. Press **Exit TV mode** or Escape to leave TV mode.

## Capacity

Supabase Free currently includes 1 GB file storage and 5 GB egress per project (shared across all Storage buckets). Every active submission has one game copy and one or more retained original versions:

- **Game copy** (`photos` bucket): a JPEG resized to at most 2400 pixels on its longest side, adaptively compressed toward ~1.5 MB and always below the bucket's 5 MiB limit. New copies use immutable `{user_id}/{challenge_id}/{version}.jpg` keys; `submissions.storage_path` selects the active one.
- **Original versions** (`photo-originals` bucket): the untouched HEIC/JPEG capture when it is 6 MiB or smaller. Larger captures are optimized client-side below 6 MiB at full resolution, and other formats are converted to full-resolution JPEG. Replacing a submission adds an immutable version; participant actions never delete earlier originals.

Budget estimate for 20 guests × 6 challenges (120 submissions) with no replacements: roughly 720 MB of originals plus up to 180 MB of game copies — near the 1 GB quota. Every replacement creates immutable original and game paths; only originals enter the ZIP, while the runbook can safely identify superseded derived JPEGs for host cleanup. The storage meter turns yellow at 75% and red at 90%.

Egress adds up too: every guest device downloads every game copy, and each originals export downloads that challenge's originals once. Avoid repeated full exports and unnecessary page reloads on the party network.

### Original Photo Export

Any active party member can download every physically stored original version as one ZIP from **Developer → Photo Export Runbook** (`/developer/photo-export/`) on a desktop browser. The preview labels current, superseded, and recovery copies; `manifest.json` records each version ID, state, current status, upload time, provenance, and Storage path. Participant replacement and upload failures never clean up original bytes. After download, a gated checklist shows the exact generated cleanup SQL, verifies host approval, deletes only those approved Storage paths through RLS, records tombstones, and refreshes the storage meter. Newer uploads are outside the export's version IDs and cannot be deleted by that cleanup.

Submissions made before the originals feature only have game copies. `scripts/backfill-legacy-originals.mjs` (run locally with the service-role key; see the script header) copies those JPEGs into `photo-originals` with `original_status = 'legacy'` so they are included in exports.

Before reusing the project, follow the coordinated database and Storage cleanup steps below.

## Event Cleanup

Submission records and Storage objects do not delete each other automatically. Do not delete a referenced file from the `photos` or `photo-originals` bucket by itself: the remaining submission can produce broken photo views or exports while still participating in voting and scoring.

For the routine mid-party flow — exporting originals and reclaiming their storage — follow the **Photo Export Runbook** on `/developer/photo-export/` instead of the steps below.

### Remove One Submission

1. Copy the active object's complete path from `submissions.storage_path`. Migrated paths may use `{user_id}/{challenge_id}.jpg`; new paths use `{user_id}/{challenge_id}/{version}.jpg`.
2. Confirm exactly one matching submission, and note its original path, before deleting anything:

```sql
select id, challenge_id, user_id, storage_path, original_path
from public.submissions
where storage_path = '<user-id>/<challenge-id>.jpg';
```

3. Delete that submission by its exact ID and path. Votes for it cascade automatically:

```sql
delete from public.submissions
where id = '<submission-id>'
  and storage_path = '<user-id>/<challenge-id>.jpg';
```

4. Delete the game copy from **Storage > photos**. Leave every `photo-originals` object in place for the versioned export workflow.
5. Verify that `public.submissions` and the game object are gone. Archived original versions remain until host cleanup.

Delete the database row first. If Storage deletion then fails, retrying leaves only an unreferenced object; deleting Storage first can leave a live submission with a missing image.

### Reset Submissions For Another Event

The following removes all submissions and votes while retaining guest profiles and display names:

```sql
delete from public.submissions;
```

Votes cascade from the deleted submissions. After the query succeeds, empty the `photos` bucket. Export and clean `photo-originals` only through the Photo Export Runbook so archived revision metadata remains coordinated with Storage.

To reset participant names as well, delete `public.profiles` instead; submissions and votes cascade, while append-only original-version metadata remains available for export. This does not delete users from Supabase Auth or memberships. Empty game copies separately and use the original cleanup runbook.
