# House Party Photo Hunt

A mobile-first housewarming photo challenge with anonymous guest profiles, direct photo uploads, three-vote rounds, TV presentation mode, and a live 3-2-1 leaderboard.

The frontend is React, TypeScript, and Vite on GitHub Pages. Supabase provides anonymous authentication, PostgreSQL, private photo storage, and realtime updates. No application server or Vercel deployment is required.

## Features

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
3. Open the SQL Editor and run `supabase/migrations/001_initial.sql` once.
4. Open **Project Settings > API** and copy the project URL and publishable key.
5. Copy `.env.example` to `.env` and fill in those two public values:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

The publishable key is designed for browser use. Never add a Supabase secret key or service-role key to this repository or the frontend environment.

Anonymous sessions belong to one browser. A guest who clears site data or changes devices will need a new display name. Supabase limits anonymous sign-ups by IP; if the party will exceed 30 guests on one network, review the Auth rate limit before the event.

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

## GitHub Pages Deployment

1. In the GitHub repository, open **Settings > Secrets and variables > Actions**.
2. Add repository secrets named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Open **Settings > Pages** and select **GitHub Actions** as the source.
4. Push to `main`, or manually run the **Deploy to GitHub Pages** workflow.

The app deploys to:

<https://leoncheng57.github.io/vibe-photo-voting-house-game/>

## Party Flow

1. Put the app URL or TV mode QR code where guests can find it.
2. Each guest enters a unique display name and joins any challenges they want.
3. Start the informational timer on the display device. It does not lock app actions.
4. When photo time ends, show one challenge at a time in TV mode.
5. Guests select and confirm three photos for that challenge on their phones.
6. Reveal that challenge's vote totals and photographers on the TV.
7. Continue through all challenges, then open **Scores** for the final leaderboard.

Use the left and right arrow keys in TV mode to switch challenges. Press the logo or Escape to leave TV mode.

## Capacity

Supabase Free currently includes 1 GB file storage and 5 GB egress. Photos are converted to JPEG and resized to at most 1800 pixels on their longest side. For a one-night event with a few dozen guests, this should be sufficient; delete old photos in Supabase Storage before reusing the project for another event.
