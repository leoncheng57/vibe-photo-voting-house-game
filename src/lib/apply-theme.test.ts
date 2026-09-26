import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, THEME_CSS_VARIABLES, THEME_TOKEN_NAMES } from '../config/settings-defaults'
import { applyTheme, resolveTheme, themeCssText, themeDeclarations } from './apply-theme'

describe('resolveTheme', () => {
  it('returns the packaged defaults when there are no overrides', () => {
    expect(resolveTheme()).toEqual(DEFAULT_THEME)
    expect(resolveTheme(null)).toEqual(DEFAULT_THEME)
  })

  it('merges a partial host theme over the defaults', () => {
    const resolved = resolveTheme({ ink: '#000000', accentGreen: '#00ff00' })
    expect(resolved.ink).toBe('#000000')
    expect(resolved.accentGreen).toBe('#00ff00')
    expect(resolved.sky).toBe(DEFAULT_THEME.sky)
  })

  it('ignores blank overrides and trims the ones it keeps', () => {
    const resolved = resolveTheme({ ink: '   ', sky: '  #123456  ' })
    expect(resolved.ink).toBe(DEFAULT_THEME.ink)
    expect(resolved.sky).toBe('#123456')
  })

  it('never mutates the shared defaults', () => {
    resolveTheme({ paper: '#abcdef' })
    expect(DEFAULT_THEME.paper).not.toBe('#abcdef')
  })
})

describe('themeDeclarations', () => {
  it('emits one declaration per contract token', () => {
    const declarations = themeDeclarations(DEFAULT_THEME)
    expect(declarations).toHaveLength(THEME_TOKEN_NAMES.length)
    expect(declarations.map((d) => d.property)).toEqual(THEME_TOKEN_NAMES.map((n) => THEME_CSS_VARIABLES[n]))
  })

  it('maps each token to the custom property the contract names', () => {
    const declarations = themeDeclarations(resolveTheme({ accentBlue: '#0000ff' }))
    expect(declarations).toContainEqual({ property: '--accent-blue', value: '#0000ff' })
    expect(declarations).toContainEqual({ property: '--ink', value: DEFAULT_THEME.ink })
  })
})

describe('themeCssText', () => {
  it('renders declarations as CSS', () => {
    expect(themeCssText(DEFAULT_THEME)).toContain(`--ink: ${DEFAULT_THEME.ink};`)
    expect(themeCssText(DEFAULT_THEME)).toContain(`--accent-green: ${DEFAULT_THEME.accentGreen};`)
  })
})

describe('applyTheme', () => {
  it('writes every token onto the target and returns the resolved theme', () => {
    const written: Record<string, string> = {}
    const target = { style: { setProperty: (property: string, value: string) => { written[property] = value } } }

    const theme = applyTheme({ ink: '#111111' }, target)

    expect(theme.ink).toBe('#111111')
    expect(Object.keys(written)).toHaveLength(THEME_TOKEN_NAMES.length)
    expect(written['--ink']).toBe('#111111')
    expect(written['--paper']).toBe(DEFAULT_THEME.paper)
  })
})
