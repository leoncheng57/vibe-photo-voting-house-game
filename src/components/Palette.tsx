import type { CSSProperties } from 'react'
import { SURFACE_THEMES, THEME_CSS_VARIABLES, THEME_TOKEN_NAMES } from '../config/settings-defaults'
import { themeDeclarations } from '../lib/apply-theme'
import type { ThemeSurface } from '../lib/active-app'
import type { ThemeTokens } from '../types'

// Roles only. Every value is read from the token registry, so this page cannot
// drift from the palettes the apps actually render.
const tokenNotes: Record<keyof ThemeTokens, { name: string; className: string; use: string }> = {
  ink: { name: 'Ink', className: 'palette-swatch--navy', use: 'Type, borders, structure' },
  sky: { name: 'Sky', className: 'palette-swatch--sky', use: 'Primary accent, buttons, active states' },
  pool: { name: 'Pool', className: 'palette-swatch--pool', use: 'Cards, banners, highlights' },
  powder: { name: 'Powder', className: 'palette-swatch--powder', use: 'Soft panels, notices' },
  ice: { name: 'Ice', className: 'palette-swatch--ice', use: 'Quiet backgrounds' },
  paper: { name: 'Paper', className: 'palette-swatch--cloud', use: 'Main canvas' },
  alert: { name: 'Alert', className: 'palette-swatch--alert', use: 'Errors, missing content, destructive actions' },
  accentBlue: { name: 'Accent', className: 'palette-swatch--accent-blue', use: 'Secondary accent, diagrams, data and storage marks' },
  accentGreen: { name: 'Status', className: 'palette-swatch--accent-green', use: 'Healthy status, progress meters' },
}

const surfaces: Array<{ surface: ThemeSurface; title: string; note: string }> = [
  { surface: 'house-party', title: 'House Photo Hunt', note: 'Navy and pool blue, served at /house-party/.' },
  { surface: 'bday-hunt', title: 'Outdoor Birthday Hunt', note: 'Springtime plum and moss, served at /bday-hunt/.' },
  { surface: 'shared', title: 'Shared pages', note: 'Neutral grey for the front page, these developer references and the legacy redirects.' },
]

// Each grid carries its own palette as custom properties, so the swatch classes
// resolve to that palette rather than to the grey this page itself runs in.
function paletteStyle(theme: ThemeTokens): CSSProperties {
  return Object.fromEntries(themeDeclarations(theme).map(({ property, value }) => [property, value])) as CSSProperties
}

export function Palette() {
  return (
    <div className="palette-page">
      <header className="palette-hero">
        <span className="eyebrow">Photo Hunt / visual system</span>
        <h1>One registry.<br /><i>Three palettes.</i></h1>
        <p>Nine tokens, filled in once per surface. Each app paints its own palette at load, and a host theme can still replace any token at runtime.</p>
      </header>

      {surfaces.map(({ surface, title, note }) => (
        <section key={surface} className="palette-grid" aria-label={`${title} palette`} style={paletteStyle(SURFACE_THEMES[surface])}>
          {THEME_TOKEN_NAMES.map((token, index) => {
            const notes = tokenNotes[token]
            return (
              <article className={`palette-swatch ${notes.className}`} key={token}>
                <span>{index === 0 ? title : String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h2>{notes.name}</h2>
                  <code>{SURFACE_THEMES[surface][token].toUpperCase()}</code>
                  <code className="palette-swatch__variable">{THEME_CSS_VARIABLES[token]}</code>
                  <p>{index === 0 ? note : notes.use}</p>
                </div>
              </article>
            )
          })}
        </section>
      ))}
    </div>
  )
}
