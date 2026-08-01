# Party Run Of Show

This is the target operating plan for a hosted House Photo Hunt event. The host controls the shared TV and phase changes; guests use their own phones. The timer is a visual cue only and never locks uploads or voting.

## Before Guests Arrive

The host should complete this preflight before sharing the link:

1. Open the party and confirm the passphrase on one guest browser.
2. Confirm TV mode loads, the QR code points to the guest entry page, and the TV browser stays signed in.
3. Upload one synthetic test photo, confirm it appears on TV, vote for it from a second browser profile, then remove all test data using the coordinated cleanup runbook.
4. Open the Photo Export Runbook and verify the storage meter is comfortably below 50%.
5. Put the party link and passphrase somewhere the host can share without displaying the passphrase in the QR code.
6. Keep a laptop available for host controls and hotfixes, but do not expose Supabase credentials or guest data on the TV.

## Phase 1: Arrival And Instructions

**Typical duration:** 15-30 minutes, or until most guests have joined.

### Guests

- Open the link or scan the TV QR code.
- Enter the host-provided passphrase.
- Choose a unique display name. A guest may edit that name later without changing identity, submissions, or votes.
- Read How to Play and start browsing challenges.

### Host

- Leave the TV on How to Play so late arrivals receive the same instructions.
- Verbally explain that each browser profile is one guest identity. A second guest needs another browser or browser profile, not another tab.
- Confirm guests can reach the challenge list before starting photo time.
- Explain that photographers remain anonymous during voting and that self-voting is allowed.

### Transition Check

Move to Phase 2 when most expected guests have joined, the TV shows the gallery correctly, and at least one host-observed upload succeeds.

## Phase 2: Photo Hunt

**Typical duration:** about 90 minutes.

### Guests

- Move around the house and take photos for any challenges they want to join.
- Submit one photo per challenge.
- Review the uploaded preview before leaving the page.
- Replacements before voting retain every full-resolution original revision and therefore consume additional storage.
- Once voting begins, the immutable-path ballot protocol rejects replacement.

### Host

- Start the device-local photo timer from TV mode.
- Leave the TV on the rotating Gallery so guests can see new submissions arrive.
- Watch the storage meter periodically.
- Below 50%: no action is normally needed.
- At 50-75%: prepare to export all current, superseded, and recovery originals; avoid unnecessary replacements.
- At or above 75%: pause new uploads if practical, export and verify the versioned ZIP, then run only that ZIP's generated `cleanup.sql` before deleting its exact manifest paths.
- Never delete a referenced Storage object directly.

### Transition Check

Move to Phase 3 after announcing a final-photo warning, allowing active uploads to finish, and confirming every challenge intended for voting has submissions.

## Phase 3: Voting And Winners

**Typical duration:** about one minute per challenge, plus the final reveal.

### Guests

- Open Vote on their phones.
- Vote on the challenge currently shown by the host.
- Submit a ballot, then revisit earlier challenges if they want to change saved votes.
- Keep the TV for shared instructions and reveals rather than entering votes there.

### Host

- Move through challenges one at a time using the TV Voting view.
- Announce the challenge and allow roughly one minute for ballots.
- Reveal each challenge only after the room confirms voting is complete.
- Use the TV-only Scores view privately between rounds if needed; show the final leaderboard when voting ends.
- Award prizes only after the final result refresh.

### Finish

1. Export and verify all original revisions plus `manifest.json` and the exact-ID `cleanup.sql` before cleanup.
2. Save any desired screenshots using synthetic or approved data only.
3. Close the party to block further database and Storage access.
4. Follow the Event Cleanup section in the README before reusing the project.

## Hotfix Protocol

If something fails during the event:

1. Keep the current phase stable; do not ask guests to repeat writes until the failure is understood.
2. Record the affected challenge, action, browser, and approximate time without recording the passphrase or private photo URLs.
3. Prefer a reversible workaround, such as advancing manually, extending the timer, or skipping one challenge.
4. Do not change RLS, expose a service-role key, or delete Storage objects as a live workaround.
5. If privacy, authentication, or data preservation is uncertain, close the party and stop writes.

## Feature Dependencies

This operating plan assumes the following tracked changes are available before the event:

- TV Gallery rotation and countdown: issue #27.
- TV Voting and How to Play pages: issue #34.
- Timer editing in TV mode: issue #36.
- Flexible, editable 1-3 vote ballots: issue #35.
- Scores visible only in TV mode: issue #41.
- Append-only replacement-photo preservation and revision-aware cleanup: issue #37.

Run the full test issue #24 against a disposable Supabase project after these features are integrated.
