# Automated Screenshot Capture Plan

This document describes how to reproduce the README screenshots without publishing private party photos, guest names, Supabase identifiers, or browser chrome. The preferred tool is cmux's built-in browser automation. Playwright is a fallback when exact viewport control is required in CI.

## Outputs

| File | View | Target CSS viewport | Capture state |
| --- | --- | --- | --- |
| `docs/images/challenges-mobile.png` | Guest challenge list | About 390 x 844 | Header, timer, introduction, and first challenge visible |
| `docs/images/voting-mobile.png` | Voting | About 390 x 844 | Sticky voting bar and anonymous photo choices visible |
| `docs/images/tv-mode-desktop.png` | TV mode | At least 1200 x 800 | Challenge title, QR code, four photos, and footer visible |
| `docs/images/leaderboard-desktop.png` | Leaderboard | At least 1200 x 800 | Heading and several synthetic ranked players visible |
| `docs/images/developer-system-desktop.png` | Developer system reference | At least 1200 x 800 | Developer navigation, system summary, and architecture section visible |
| `docs/images/github-priority-groups.png` | GitHub project progress | At least 1200 x 800 | Public issues grouped under High, Medium, and Low priority headings |

Retina screenshots may have twice the target pixel dimensions. The CSS viewport, not the PNG's physical pixel dimensions, determines responsive behavior.

## Data Safety

Use a disposable Supabase project populated only with synthetic profiles and submissions whenever possible. Never upload screenshot fixtures to the production party project.

Before saving any screenshot:

- Replace every rendered photo with generated artwork or a repository-owned fixture.
- Replace visible profile names with `Demo Guest`.
- Replace leaderboard names, wins, and vote totals with synthetic presentation data.
- Do not reveal voting results, which can expose photographer names.
- Do not show the Supabase dashboard, object paths, UUIDs, environment values, browser storage, or developer tools.
- Do not click upload, vote confirmation, profile save, or any other control that writes data.
- Inspect the final PNG before adding it to Git.

## Start The App

Use the existing development server when it is already running. Otherwise:

```bash
npm run dev -- --host 127.0.0.1
```

For views that require submissions, configure the local app against a disposable Supabase project with synthetic data. If a safe demo session is already open in cmux, it can be used without creating new records.

## Open A Browser Surface

Open the guest home route in a dedicated browser surface:

```bash
cmux browser open "http://127.0.0.1:5173/play/" --focus false
```

The command returns a dynamic surface reference such as `surface:19`. Use that value for subsequent commands and confirm the loaded page:

```bash
cmux browser --surface <surface> wait --load-state complete --timeout-ms 15000
cmux browser --surface <surface> get text body
```

## Control The Viewport

cmux screenshots use the browser pane's current viewport. Check it before every capture:

```bash
cmux browser --surface <surface> eval "JSON.stringify({ innerWidth, innerHeight, devicePixelRatio })"
```

For a mobile capture, resize the browser pane to approximately 390 CSS pixels wide. Pane references are dynamic, so inspect the layout first:

```bash
cmux tree --all
```

Create or resize an adjacent pane until the browser reports the target width. For example:

```bash
cmux resize-pane --pane <adjacent-pane> -R --amount <pixels>
```

For TV mode, use a browser surface in a dedicated cmux window so the browser receives the largest available viewport:

```bash
cmux new-window
cmux --id-format both tree --all
cmux new-surface --type browser --pane <pane-uuid> --window <window-uuid> --url "http://127.0.0.1:5173/play/" --focus true
```

Target sizes are approximate. Verify that mobile media queries are active and that the TV layout remains on one screen.

## Sanitize The Rendered Page

As a defense in depth measure, replace visible user data immediately before capture. The exact selectors may need updating if component markup changes.

Replace the displayed profile name:

```bash
cmux browser --surface <surface> eval "document.querySelector('.player-chip strong')?.replaceChildren('Demo Guest')"
```

Replace photo elements with generated SVG data URLs. The following pattern avoids external image dependencies:

```javascript
const colors = ['#b9dded', '#59b7aa', '#f4df73', '#10253f']

document.querySelectorAll('img').forEach((image, index) => {
  const color = colors[index % colors.length]
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
      <rect width="1200" height="900" fill="${color}" />
      <circle cx="240" cy="190" r="140" fill="#f4b8aa" />
      <path d="M0 700 Q300 470 600 680 T1200 560 V900 H0Z" fill="#59b7aa" />
      <path d="M300 700 V370 L600 170 900 370 V700Z" fill="#f4f0e8" stroke="#111" stroke-width="22" />
      <path d="M260 400 600 150 940 400" fill="none" stroke="#111" stroke-width="36" />
    </svg>`

  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
})
```

Run equivalent JavaScript through `cmux browser eval`, then wait for all replacements to finish loading:

```bash
cmux browser --surface <surface> wait --function "Array.from(document.images).every((image) => image.complete)" --timeout-ms 5000
```

The generated artwork should use the application's palette and remain visibly synthetic. Do not embed downloaded or production photos in the data URL.

## Capture Each View

### Guest Challenges

1. Navigate to Home.
2. Scroll to the top.
3. Sanitize the profile name and every image.
4. Confirm a mobile viewport.
5. Capture:

```bash
cmux browser --surface <surface> screenshot --out "$(pwd)/docs/images/challenges-mobile.png" --json
```

### Voting

1. Open Vote without selecting or confirming anything.
2. Wait for `.photo-grid--vote`.
3. Replace all `.photo-choice img` sources with generated artwork.
4. Scroll until the sticky voting bar and photo grid are both visible.
5. Capture:

```bash
cmux browser --surface <surface> screenshot --out "$(pwd)/docs/images/voting-mobile.png" --json
```

### TV Mode

1. Use a desktop-width browser surface.
2. Open TV mode and wait for `.display-view`.
3. Replace all `.photo-grid--gallery img` sources with generated artwork.
4. Keep the Gallery tab active with both challenge-captioned rows visible; Gallery never renders photographer names or vote totals.
5. Capture:

```bash
cmux browser --surface <surface> screenshot --out "$(pwd)/docs/images/tv-mode-desktop.png" --json
```

### Leaderboard

1. Use a desktop-width browser surface, open TV Voting, and confirm **Reveal final scores**.
2. Wait for `.leaderboard` to load.
3. Replace `.player-chip strong` with `Demo Guest`.
4. Replace every leaderboard name, rank, win count, and vote total with synthetic presentation data. Remove extra rows if needed.
5. Capture immediately so the leaderboard's periodic refresh does not restore live data:

```bash
cmux browser --surface <surface> screenshot --out "$(pwd)/docs/images/leaderboard-desktop.png" --json
```

### Developer System Reference

1. Navigate to `http://127.0.0.1:5173/developer/system/`.
2. Wait for the page to load and scroll to the top.
3. Confirm the desktop viewport shows the developer navigation, system summary, and beginning of the architecture section.
4. Capture:

```bash
cmux browser --surface <surface> screenshot --out "$(pwd)/docs/images/developer-system-desktop.png" --json
```

### GitHub Priority Groups

1. Navigate to `http://127.0.0.1:5173/developer/github-progress/`.
2. Wait for the public GitHub issue data and all priority groups to load.
3. Scroll the Issues panel into view at a desktop width of at least 1200 px.
4. Confirm no private repository or participant data appears.
5. Capture:

```bash
cmux browser --surface <surface> screenshot --out "$(pwd)/docs/images/github-priority-groups.png" --json
```

### Developer Palette

1. Navigate to `http://127.0.0.1:5173/developer/palette/`.
2. Wait for the page to load and scroll to the top.
3. Confirm the developer shell, active Palette tab, hero, and first swatches are visible at a desktop width of at least 1200 px.
4. Capture:

```bash
cmux browser --surface <surface> screenshot --out "$(pwd)/docs/images/developer-palette-desktop.png" --json
```

## Playwright Fallback

Playwright is not a project dependency. If cmux cannot provide a suitable viewport, use an ephemeral Playwright installation rather than changing `package.json`. Point it only at a local app backed by disposable demo data.

Use explicit viewport sizes of 390 x 844 for mobile and 1440 x 900 for TV mode. Reuse the same sanitization JavaScript before `page.screenshot()`. Do not save Playwright authentication state, cookies, traces, videos, or network logs in the repository.

## Verification

Open each image and inspect it visually. Then confirm file sizes:

```bash
du -h docs/images/*.png
```

Aim for less than 500 KB per image where practical. Finally, verify that:

- Mobile captures use the mobile layout and contain readable text.
- The voting capture shows anonymous choices but no photographer identity.
- TV mode fits in one frame and keeps results hidden.
- Leaderboard names and scores are synthetic and no live identity remains.
- The Developer capture contains only repository architecture documentation.
- The GitHub progress capture contains only public repository metadata and shows priority grouping clearly.
- No personal photo, guest name, UUID, token, or dashboard detail appears.
- README paths and alt text match the generated filenames.
- `npm test`, `npm run lint`, and `npm run build` pass.
