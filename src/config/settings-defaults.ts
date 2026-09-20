// Canonical source for every themeable token and game-mode default.
//
// The seven-token :root block was copy-pasted into four stylesheets and had
// already drifted (landing.css was missing --ice and --alert; navigation.css
// referenced --alert without defining it). This module is now the only place a
// token name or default value is declared; stylesheets consume them at runtime
// through applyTheme.

import type { GameSettings, ThemeTokens, WinnerMode } from '../types'

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

export const DEFAULT_THEME: ThemeTokens = {
  ink: '#241436',
  sky: '#a78bfa',
  pool: '#c4b5fd',
  powder: '#ddd6fe',
  ice: '#f0ebff',
  paper: '#faf8ff',
  alert: '#ffd6e7',
  accentBlue: '#7dd3fc',
  accentGreen: '#86efac',
}

export const WINNER_MODES: readonly WinnerMode[] = ['voting', 'random'] as const

export const DEFAULT_WINNER_MODE: WinnerMode = 'voting'

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  theme: DEFAULT_THEME,
  winnerMode: DEFAULT_WINNER_MODE,
}
