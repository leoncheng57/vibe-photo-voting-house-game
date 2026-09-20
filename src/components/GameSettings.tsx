import { useCallback, useEffect, useState } from 'react'
import type { GameSettings as GameSettingsValue, ThemeTokens, WinnerMode } from '../types'
import { DEFAULT_GAME_SETTINGS, THEME_TOKEN_NAMES, WINNER_MODES } from '../config/settings-defaults'
import { getGameSettings, updateGameSettings } from '../lib/api'
import { errorMessage } from '../lib/errors'
import {
  buildSettingsUpdate,
  isHexColor,
  isWinnerMode,
  normalizeHexColor,
  submitBlocker,
  submitBlockerMessage,
  THEME_TOKEN_LABELS,
  WINNER_MODE_HINTS,
  WINNER_MODE_LABELS,
} from '../lib/settings'

const HOST_PIN_SQL_SNIPPET = "select set_host_pin('your-pin');"

interface Props {
  onBack?: () => void
  onSettingsChange?: (settings: GameSettingsValue) => void
}

// The host PIN lives in component state only: never persisted, never logged,
// never put on a URL.
export function GameSettings({ onBack, onSettingsChange }: Props) {
  const [saved, setSaved] = useState<GameSettingsValue>(DEFAULT_GAME_SETTINGS)
  const [draft, setDraft] = useState<GameSettingsValue>(DEFAULT_GAME_SETTINGS)
  const [hostPinSet, setHostPinSet] = useState(false)
  const [hostPin, setHostPin] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [hostPinSqlCopied, setHostPinSqlCopied] = useState(false)

  async function copyHostPinSqlToClipboard() {
    try {
      await navigator.clipboard.writeText(HOST_PIN_SQL_SNIPPET)
      setHostPinSqlCopied(true)
      setTimeout(() => setHostPinSqlCopied(false), 1600)
    } catch {
      // Clipboard access denied; the snippet stays selectable as a fallback.
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const record = await getGameSettings()
      const next: GameSettingsValue = { theme: record.theme, winnerMode: record.winnerMode }
      setSaved(next)
      setDraft(next)
      setHostPinSet(record.hostPinSet)
      onSettingsChange?.(next)
    } catch (loadError) {
      setError(errorMessage(loadError, 'Could not load the party settings.'))
    } finally {
      setLoading(false)
    }
  }, [onSettingsChange])

  useEffect(() => {
    void load()
  }, [load])

  const blocker = submitBlocker({ current: saved, draft, hostPin, hostPinSet, saving })
  const blockerMessage = submitBlockerMessage(blocker)

  function setToken(name: keyof ThemeTokens, value: string) {
    setStatus('')
    setDraft((previous) => ({ ...previous, theme: { ...previous.theme, [name]: value } }))
  }

  function setWinnerMode(mode: WinnerMode) {
    setStatus('')
    setDraft((previous) => ({ ...previous, winnerMode: mode }))
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (blocker) return

    const update = buildSettingsUpdate(saved, draft)
    setSaving(true)
    setError('')
    setStatus('')
    try {
      await updateGameSettings(hostPin, update)
      const next: GameSettingsValue = {
        theme: update.theme ?? saved.theme,
        winnerMode: update.winnerMode ?? saved.winnerMode,
      }
      setSaved(next)
      setDraft(next)
      setHostPin('')
      setStatus('Saved. The party is wearing the new look.')
      onSettingsChange?.(next)
    } catch (saveError) {
      setError(errorMessage(saveError, 'Could not save the party settings.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-page">
      {onBack && (
        <button type="button" className="tutorial-back" onClick={onBack}>
          ← Back to the party
        </button>
      )}

      <header className="settings-hero">
        <span className="eyebrow">Host controls</span>
        <h1>Party<br /><i>settings.</i></h1>
        <p>Repaint the room and choose how each challenge picks its winner.</p>
      </header>

      {loading && <p className="settings-loading">Loading the party settings…</p>}

      {!loading && !hostPinSet && (
        <section className="empty-state settings-empty">
          <h2>No host PIN yet</h2>
          <p>
            Settings are protected by a host PIN, and there is no host role in this app — every guest signs in
            anonymously. Set the PIN once from the Supabase SQL editor:
          </p>
          <pre className="settings-sql"><code>{HOST_PIN_SQL_SNIPPET}</code></pre>
          <button type="button" className="button" onClick={() => void copyHostPinSqlToClipboard()}>
            {hostPinSqlCopied ? 'Copied' : 'Copy the SQL'}
          </button>
          <p>Reload this page afterwards and the form below unlocks.</p>
          <button type="button" className="button" onClick={() => void load()}>
            Check again
          </button>
        </section>
      )}

      {!loading && hostPinSet && (
        <form className="settings-form" onSubmit={(event) => void save(event)}>
          <section className="settings-section">
            <h2>Winner mode</h2>
            <p className="settings-section__note">How every challenge winner is decided.</p>
            <div className="settings-modes">
              {WINNER_MODES.map((mode) => (
                <label
                  key={mode}
                  className={`settings-mode${draft.winnerMode === mode ? ' settings-mode--active' : ''}`}
                >
                  <input
                    type="radio"
                    name="winner-mode"
                    value={mode}
                    checked={draft.winnerMode === mode}
                    onChange={(event) => {
                      if (isWinnerMode(event.target.value)) setWinnerMode(event.target.value)
                    }}
                  />
                  <span className="settings-mode__label">{WINNER_MODE_LABELS[mode]}</span>
                  <small>{WINNER_MODE_HINTS[mode]}</small>
                </label>
              ))}
            </div>
          </section>

          <section className="settings-section">
            <h2>Palette</h2>
            <p className="settings-section__note">Nine colors drive every screen, including TV mode.</p>
            <div className="settings-tokens">
              {THEME_TOKEN_NAMES.map((name) => {
                const value = draft.theme[name]
                const valid = isHexColor(value)
                return (
                  <div key={name} className="settings-token">
                    <label className="settings-token__label" htmlFor={`theme-${name}`}>
                      {THEME_TOKEN_LABELS[name]}
                    </label>
                    <div className="settings-token__inputs">
                      <input
                        type="color"
                        className="settings-token__swatch"
                        aria-label={`${THEME_TOKEN_LABELS[name]} color picker`}
                        value={normalizeHexColor(value) ?? '#000000'}
                        onChange={(event) => setToken(name, event.target.value)}
                      />
                      <input
                        id={`theme-${name}`}
                        type="text"
                        className="settings-token__hex"
                        inputMode="text"
                        maxLength={7}
                        autoComplete="off"
                        spellCheck={false}
                        value={value}
                        aria-invalid={!valid}
                        onChange={(event) => setToken(name, event.target.value)}
                      />
                    </div>
                    {!valid && <small className="form-error">Use a hex value like #a78bfa.</small>}
                  </div>
                )
              })}
            </div>
            <button type="button" className="button" onClick={() => setDraft({ ...draft, theme: saved.theme })}>
              Reset colors
            </button>
          </section>

          <section className="settings-section">
            <h2>Host PIN</h2>
            <p className="settings-section__note">Required for every save. It is never stored on this device.</p>
            <input
              id="host-pin"
              type="password"
              className="settings-pin"
              autoComplete="off"
              inputMode="numeric"
              placeholder="Host PIN"
              aria-label="Host PIN"
              value={hostPin}
              onChange={(event) => {
                setStatus('')
                setHostPin(event.target.value)
              }}
            />
          </section>

          {error && <p className="notice notice--error" role="alert">{error}</p>}
          {status && <p className="notice" role="status">{status}</p>}

          <div className="settings-actions">
            <button type="submit" className="button button--dark" disabled={Boolean(blocker)}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            {blockerMessage && <small className="settings-actions__hint">{blockerMessage}</small>}
          </div>
        </form>
      )}
    </div>
  )
}
