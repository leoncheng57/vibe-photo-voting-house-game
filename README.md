# House Party Photo Hunt

A mobile-first housewarming photo challenge with passphrase-gated entry, anonymous guest profiles, direct photo uploads, three-vote rounds, TV presentation mode, and a live 3-2-1 leaderboard.

The frontend is React, TypeScript, and Vite on GitHub Pages. Supabase provides anonymous authentication, PostgreSQL, private photo storage, and realtime updates. No application server or Vercel deployment is required.

## Screenshots

### Guest experience

<p align="center">
  <img src="docs/images/challenges-mobile.png" width="320" alt="Mobile challenge list showing photo prompts and upload controls">
  <img src="docs/images/voting-mobile.png" width="320" alt="Mobile voting view showing the anonymous photo selection experience">
</p>

### TV mode

![Desktop TV mode showing a challenge presentation and QR join code](docs/images/tv-mode-desktop.png)

### Leaderboard

![Desktop leaderboard showing synthetic player names, wins, and scores](docs/images/leaderboard-desktop.png)

### Developer reference

![Desktop developer system reference showing architecture documentation and navigation](docs/images/developer-system-desktop.png)

### GitHub project priorities

![Desktop GitHub project progress dashboard with issues grouped by high, medium, and low priority](docs/images/github-priority-groups.png)

## Features

- Passphrase-gated party membership enforced by Postgres row-level security
- Six included housewarming photo challenges
- One replaceable photo per guest per challenge
- In-browser photo resizing before upload
- Up to three equal votes for distinct photos; self-voting allowed
- 3-2-1 podium scoring with competition ranking for ties
- Informational, device-local configurable timer
- Built-in tutorial walkthrough for first-time guests
- Developer references for architecture, database design, security and operations, and GitHub project progress under `/developer/`
- Anonymous photographer names during voting
- TV mode with QR join code, keyboard navigation, and result reveal
- Responsive layout for phones, laptops, and large televisions

## Supabase Setup

1. Create a project on [Supabase](https://supabase.com/).
2. Open **Authentication > Providers > Anonymous Sign-Ins** and enable anonymous sign-ins.
3. Apply the migrations in `supabase/migrations/` once, in numeric order. Either:
   - **Supabase CLI (preferred):** `supabase login`, `supabase link --project-ref <your-ref>`, then `supabase db push`. If earlier migrations were ever applied by hand, first baseline them with `supabase migration repair --status applied <versions>`.
   - **SQL Editor:** paste and run each file once, in numeric order:
     - `supabase/migrations/001_initial.sql`
     - `supabase/migrations/002_remove_challenges.sql`
     - `supabase/migrations/003_flexible_vote_count.sql`
     - `supabase/migrations/004_party_membership.sql`
4. Set the party passphrase in the SQL Editor. Nobody can join until this runs:

```sql
select set_party_passphrase('your-long-passphrase');
```

5. Open **Project Settings > API** and copy the project URL and publishable key.
6. Copy `.env.example` to `.env` and fill in those two public values:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

The publishable key is designed for browser use. Never add a Supabase secret key or service-role key to this repository or the frontend environment.

Anonymous sessions belong to one browser. A guest who clears site data or changes devices will need to re-enter the passphrase and pick a new display name. Supabase limits anonymous sign-ups by IP; if the party will exceed 30 guests on one network, review the Auth rate limit before the event.

## Party Access

Guests must enter a shared passphrase before they can read or write anything, including photo bytes. The passphrase is validated inside Postgres against a bcrypt hash; the plaintext is never stored in the repository, JavaScript bundle, QR code, or database. Share it out of band — say it aloud or write it on a board at the party.

Host controls (run in the Supabase SQL Editor; the full runbook is on `/developer/security-ops/`):

```sql
select set_party_passphrase('maple-otter-battery-42');  -- set or rotate (12+ characters)
update party_settings set is_open = false;              -- close the party instantly
update party_settings set is_open = true;               -- reopen
delete from memberships;                                -- reset: everyone re-enters the passphrase
```

Rotating the passphrase does not remove existing members; deleting memberships does. Closing the party blocks all database and Storage requests immediately, including for existing members, without redeploying the site.

## Local Development

```bash
npm install
npm run dev
```

Validation commands:

```bash
npm test
npm run lint
npm run build
```

See [`SCREENSHOT_CAPTURE_PLAN.md`](SCREENSHOT_CAPTURE_PLAN.md) for the privacy-safe, automated README screenshot workflow.

## GitHub Pages Deployment

1. In the GitHub repository, open **Settings > Secrets and variables > Actions**.
2. Add repository secrets named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Open **Settings > Pages** and select **GitHub Actions** as the source.
4. Push to `main`, or manually run the **Deploy to GitHub Pages** workflow.

The app deploys to:

<https://leoncheng57.github.io/vibe-photo-voting-house-game/>

## Party Flow

1. Put the app URL or TV mode QR code where guests can find it, and share the party passphrase out of band.
2. Each guest enters the passphrase, then a unique display name, and joins any challenges they want. The TV device enters the passphrase once too.
3. Start the informational timer on the display device. It does not lock app actions.
4. When photo time ends, show one challenge at a time in TV mode.
5. Guests select and confirm three photos for that challenge on their phones.
6. Reveal that challenge's vote totals and photographers on the TV.
7. Continue through all challenges, then open **Scores** for the final leaderboard.

Use the left and right arrow keys in TV mode to switch challenges. Press the logo or Escape to leave TV mode.

## Capacity

Supabase Free currently includes 1 GB file storage and 5 GB egress. Photos are converted to JPEG and resized to at most 1800 pixels on their longest side. For a one-night event with a few dozen guests, this should be sufficient. Before reusing the project, follow the coordinated database and Storage cleanup steps below.

## Event Cleanup

Submission records and Storage objects do not delete each other automatically. Do not delete a referenced file from the `photos` bucket by itself: the remaining submission can produce broken photo views while still participating in voting and scoring.

### Remove One Submission

1. Copy the object's complete path from the `photos` bucket. Paths use `{user_id}/{challenge_id}.jpg`.
2. Confirm exactly one matching submission before deleting anything:

```sql
select id, challenge_id, user_id, storage_path
from public.submissions
where storage_path = '<user-id>/<challenge-id>.jpg';
```

3. Delete that submission by its exact ID and path. Votes for it cascade automatically:

```sql
delete from public.submissions
where id = '<submission-id>'
  and storage_path = '<user-id>/<challenge-id>.jpg';
```

4. Delete the same object from **Storage > photos**.
5. Verify that neither `public.submissions` nor `storage.objects` contains the path.

Delete the database row first. If Storage deletion then fails, retrying leaves only an unreferenced object; deleting Storage first can leave a live submission with a missing image.

### Reset Submissions For Another Event

The following removes all submissions and votes while retaining guest profiles and display names:

```sql
delete from public.submissions;
```

Votes cascade from the deleted submissions. After the query succeeds, empty the `photos` bucket in the Supabase Storage dashboard. Verify both systems before starting the next event.

To reset participant names as well, delete `public.profiles` instead; submissions and votes cascade. This does not delete users from Supabase Auth, and it does not remove party memberships — run `delete from public.memberships;` to require the passphrase again. Empty the `photos` bucket separately.
