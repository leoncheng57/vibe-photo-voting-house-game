// Canonical source for every themeable token and its per-surface defaults.
//
// The seven-token :root block was copy-pasted into four stylesheets and had
// already drifted (landing.css was missing --ice and --alert; navigation.css
// referenced --alert without defining it). This module is now the only place a
// token name or default value is declared; stylesheets consume them at runtime
// through applyTheme.

import type { ThemeTokens } from '../types'
import { getActiveThemeSurface, type ThemeSurface } from '../lib/active-app'

export const THEME_TOKEN_NAMES = [
  'ink',
  'sky',
  'pool',
  'powder',
  'ice',
  'paper',
  'alert',
  'accentBlue',
  'accentGreen',
] as const

// CSS custom property each token maps to. Agents must not invent new mappings:
// a token absent from this record will not reach the stylesheet.
export const THEME_CSS_VARIABLES: Record<keyof ThemeTokens, string> = {
  ink: '--ink',
  sky: '--sky',
  pool: '--pool',
  powder: '--powder',
  ice: '--ice',
  paper: '--paper',
  alert: '--alert',
  accentBlue: '--accent-blue',
  accentGreen: '--accent-green',
}

// Each app has its own look, and the pages they share (the front page, the
// developer references, the legacy redirects) stay neutral grey so neither
// app's palette reads as the site's. A host theme still overrides per project.
export const HOUSE_PARTY_THEME: ThemeTokens = {
  ink: '#10233d',
  sky: '#8fd7f3',
  pool: '#b7e6f7',
  powder: '#d5f0fa',
  ice: '#eaf8fc',
  paper: '#f5f8f7',
  alert: '#ffd6d6',
  accentBlue: '#087da8',
  accentGreen: '#5fae82',
}

export const BDAY_HUNT_THEME: ThemeTokens = {
  ink: '#2f1b2b',
  sky: '#bb81b5',
  pool: '#cea6c9',
  powder: '#ddc4da',
  ice: '#e9dcec',
  paper: '#faf7fb',
  alert: '#eec6d6',
  accentBlue: '#cb96c4',
  accentGreen: '#9cb88b',
}

export const SHARED_THEME: ThemeTokens = {
  ink: '#1f1f1f',
  sky: '#a6a6a6',
  pool: '#c2c2c2',
  powder: '#d9d9d9',
  ice: '#ebebeb',
  paper: '#f7f7f7',
  alert: '#e0e0e0',
  accentBlue: '#6e6e6e',
  accentGreen: '#8c8c8c',
}

export const SURFACE_THEMES: Record<ThemeSurface, ThemeTokens> = {
  'house-party': HOUSE_PARTY_THEME,
  'bday-hunt': BDAY_HUNT_THEME,
  shared: SHARED_THEME,
}

// Resolved once per page load: every runtime consumer (applyTheme, the settings
// RPC merge, the palette page) reads the palette of the page it is running on.
export const DEFAULT_THEME: ThemeTokens = SURFACE_THEMES[getActiveThemeSurface()]
