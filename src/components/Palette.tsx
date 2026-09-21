import { DEFAULT_THEME, THEME_CSS_VARIABLES, THEME_TOKEN_NAMES } from '../config/settings-defaults'
import type { ThemeTokens } from '../types'

// Names and usage notes only — every value is read from the token registry, so
// the documentation page cannot drift from the theme the app actually renders.
const tokenNotes: Record<keyof ThemeTokens, { name: string; className: string; use: string }> = {
  ink: { name: 'Deep Plum', className: 'palette-swatch--navy', use: 'Type, borders, structure' },
  sky: { name: 'Dark Lavender', className: 'palette-swatch--sky', use: 'Primary accent, buttons, active states' },
  pool: { name: 'Orchid', className: 'palette-swatch--pool', use: 'Cards, banners, highlights' },
  powder: { name: 'Lilac', className: 'palette-swatch--powder', use: 'Soft panels, notices' },
  ice: { name: 'Lavender Wash', className: 'palette-swatch--ice', use: 'Quiet backgrounds' },
  paper: { name: 'Cloud', className: 'palette-swatch--cloud', use: 'Main canvas' },
  alert: { name: 'Alert Rose', className: 'palette-swatch--alert', use: 'Errors, missing content, destructive actions' },
  accentBlue: { name: 'Signal Orchid', className: 'palette-swatch--accent-blue', use: 'Secondary accent, diagrams, data and storage marks' },
  accentGreen: { name: 'Moss Green', className: 'palette-swatch--accent-green', use: 'Secondary accent, healthy status, progress meters' },
}

const colors = THEME_TOKEN_NAMES.map((token) => ({
  token,
  variable: THEME_CSS_VARIABLES[token],
  value: DEFAULT_THEME[token].toUpperCase(),
  ...tokenNotes[token],
}))

export function Palette() {
  return (
    <div className="palette-page">
      <header className="palette-hero">
        <span className="eyebrow">House Photo Hunt / visual system</span>
        <h1>Deep plum.<br /><i>Springtime signal.</i></h1>
        <p>One registry of nine tokens: a plum core with lavender and moss accents. Every value here is the live default, and a host theme can replace any of them at runtime.</p>
      </header>

      <section className="palette-grid" aria-label="Website color palette">
        {colors.map((color, index) => (
          <article className={`palette-swatch ${color.className}`} key={color.token}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{color.name}</h2>
              <code>{color.value}</code>
              <code className="palette-swatch__variable">{color.variable}</code>
              <p>{color.use}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="palette-combinations">
        <span className="eyebrow">Approved combinations</span>
        <div>
          <article className="palette-combo palette-combo--sky"><b>LAVENDER / ORCHID</b><span>Everyday energy</span></article>
          <article className="palette-combo palette-combo--navy"><b>PLUM / LAVENDER</b><span>Big-screen drama</span></article>
          <article className="palette-combo palette-combo--accents"><b>ORCHID / MOSS</b><span>Diagrams and status</span></article>
        </div>
      </section>
    </div>
  )
}
