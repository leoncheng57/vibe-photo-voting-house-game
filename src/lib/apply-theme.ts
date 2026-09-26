import { DEFAULT_THEME, THEME_CSS_VARIABLES } from '../config/settings-defaults'
import type { ThemeTokens } from '../types'

export interface ThemeDeclaration {
  property: string
  value: string
}

/** Anything that can receive custom properties — an element, or a stub in tests. */
export interface ThemeTarget {
  style: { setProperty(property: string, value: string): void }
}

const TOKEN_KEYS = Object.keys(THEME_CSS_VARIABLES) as (keyof ThemeTokens)[]

function isUsableValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** Merge a partial host theme over the packaged defaults, ignoring blank overrides. */
export function resolveTheme(overrides?: Partial<ThemeTokens> | null): ThemeTokens {
  const resolved = { ...DEFAULT_THEME }
  if (!overrides) return resolved
  for (const key of TOKEN_KEYS) {
    const value = overrides[key]
    if (isUsableValue(value)) resolved[key] = value.trim()
  }
  return resolved
}

/** Every token as a CSS custom property declaration, driven by THEME_CSS_VARIABLES. */
export function themeDeclarations(theme: ThemeTokens): ThemeDeclaration[] {
  return TOKEN_KEYS.map((key) => ({ property: THEME_CSS_VARIABLES[key], value: theme[key] }))
}

/** Declarations as a CSS text block, for inlining into a <style> rule. */
export function themeCssText(theme: ThemeTokens): string {
  return themeDeclarations(theme)
    .map(({ property, value }) => `${property}: ${value};`)
    .join(' ')
}

/** Thin side-effecting wrapper: write the resolved theme onto a document element. */
export function applyTheme(overrides: Partial<ThemeTokens> | null | undefined, target: ThemeTarget): ThemeTokens {
  const theme = resolveTheme(overrides)
  for (const { property, value } of themeDeclarations(theme)) {
    target.style.setProperty(property, value)
  }
  return theme
}
