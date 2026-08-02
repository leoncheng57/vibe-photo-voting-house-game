import { useEffect, useRef, useState } from 'react'
import {
  beginSpotifyAuthorization,
  clearSpotifyAuthorization,
  getSpotifyAccessToken,
  hasSpotifyAuthorization,
  isSpotifyConfigured,
  spotifyApi,
} from '../lib/spotify'
import {
  normalizeSpotifyPlayerLayout,
  parseSpotifyPlayerLayout,
  type SpotifyPlayerLayout,
} from '../lib/spotify-layout'

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js'
const SDK_SCRIPT_ID = 'spotify-web-playback-sdk'
const LAYOUT_STORAGE_KEY = 'house-photo-hunt.spotify.player-layout'

let sdkRequest: Promise<void> | null = null

function loadSpotifySdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve()
  if (sdkRequest) return sdkRequest
  const request = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SDK_SCRIPT_ID) as HTMLScriptElement | null
    const script = existing ?? document.createElement('script')
    window.onSpotifyWebPlaybackSDKReady = resolve
    script.addEventListener('error', () => {
      script.remove()
      reject(new Error('Could not load the Spotify player.'))
    }, { once: true })
    if (!existing) {
      script.id = SDK_SCRIPT_ID
      script.src = SDK_URL
      script.async = true
      document.body.appendChild(script)
    }
  }).catch((reason) => {
    sdkRequest = null
    throw reason
  })
  sdkRequest = request
  return request
}

function PlayIcon({ paused }: { paused: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    {paused
      ? <path d="M8 5v14l11-7z" />
      : <><path d="M6 5h4v14H6z" /><path d="M14 5h4v14h-4z" /></>}
  </svg>
}

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`
}

export function SpotifyPlayer({ authorizationError = '' }: { authorizationError?: string }) {
  const [connected, setConnected] = useState(hasSpotifyAuthorization)
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(authorizationError)
  const [status, setStatus] = useState('Connect Spotify to play music through this TV.')
  const [playback, setPlayback] = useState<Spotify.WebPlaybackState | null>(null)
  const [progress, setProgress] = useState(0)
  const [layout, setLayout] = useState<SpotifyPlayerLayout>(() => parseSpotifyPlayerLayout(localStorage.getItem(LAYOUT_STORAGE_KEY)))
  const player = useRef<Spotify.Player | null>(null)
  const deviceId = useRef('')
  const mounted = useRef(true)
  const resizeCleanup = useRef<(() => void) | null>(null)
  const operationId = useRef(0)

  useEffect(() => { setError(authorizationError) }, [authorizationError])

  useEffect(() => {
    mounted.current = true
    if (!connected || !isSpotifyConfigured) return () => { mounted.current = false }
    let currentPlayer: Spotify.Player | null = null
    let cancelled = false

    loadSpotifySdk().then(async () => {
      if (cancelled || !mounted.current || !window.Spotify) return
      currentPlayer = new window.Spotify.Player({
        name: 'House Photo Hunt TV',
        enableMediaSession: true,
        getOAuthToken: (callback) => {
          getSpotifyAccessToken()
            .then(callback)
            .catch((reason) => { if (!cancelled && mounted.current) setError(reason instanceof Error ? reason.message : 'Spotify login expired.') })
        },
        volume: 0.7,
      })
      player.current = currentPlayer
      currentPlayer.addListener('ready', ({ device_id }) => {
        if (cancelled || !mounted.current) return
        deviceId.current = device_id
        setReady(true)
        setStatus('Ready. Move your current Spotify playback to this TV.')
      })
      currentPlayer.addListener('not_ready', () => {
        if (cancelled || !mounted.current) return
        setReady(false)
        setActive(false)
        setStatus('The TV player is offline. Check its connection and try again.')
      })
      currentPlayer.addListener('player_state_changed', (state) => {
        if (cancelled || !mounted.current) return
        setPlayback(state)
        setProgress(state?.position ?? 0)
        setActive(Boolean(state))
        if (state) setStatus(state.paused ? 'Playback paused on this TV.' : 'Playing through this TV.')
      })
      currentPlayer.addListener('autoplay_failed', () => {
        if (!cancelled && mounted.current) setError('Your browser blocked audio. Click Play on TV again.')
      })
      currentPlayer.addListener('account_error', () => {
        if (!cancelled && mounted.current) setError('Spotify Web Playback requires an eligible Premium account.')
      })
      currentPlayer.addListener('initialization_error', ({ message }) => {
        if (!cancelled && mounted.current) setError(`This browser cannot initialize Spotify playback. ${message}`)
      })
      currentPlayer.addListener('authentication_error', () => {
        if (!cancelled && mounted.current) setError('Spotify authentication expired. Disconnect and connect again.')
      })
      currentPlayer.addListener('playback_error', ({ message }) => {
        if (!cancelled && mounted.current) setError(`Spotify could not play this item. ${message}`)
      })
      const success = await currentPlayer.connect()
      if (!success && !cancelled && mounted.current) setError('Could not connect this browser to Spotify.')
    }).catch((reason) => {
      if (!cancelled && mounted.current) setError(reason instanceof Error ? reason.message : 'Could not load Spotify.')
    })

    return () => {
      cancelled = true
      mounted.current = false
      currentPlayer?.disconnect()
      player.current = null
    }
  }, [connected])

  useEffect(() => {
    if (!playback || playback.paused) return
    const interval = window.setInterval(() => {
      setProgress((value) => Math.min(playback.duration, value + 1000))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [playback])

  useEffect(() => {
    function fitToViewport() {
      setLayout((current) => normalizeSpotifyPlayerLayout(current))
    }
    window.addEventListener('resize', fitToViewport)
    return () => window.removeEventListener('resize', fitToViewport)
  }, [])

  useEffect(() => () => { resizeCleanup.current?.() }, [])

  function saveLayout(nextLayout: SpotifyPlayerLayout) {
    const normalized = normalizeSpotifyPlayerLayout(nextLayout)
    setLayout(normalized)
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(normalized))
  }

  function startResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    resizeCleanup.current?.()
    const startX = event.clientX
    const startY = event.clientY
    const startLayout = layout
    event.currentTarget.setPointerCapture(event.pointerId)

    const move = (moveEvent: PointerEvent) => {
      const horizontalDelta = moveEvent.clientX - startX
      const verticalDelta = moveEvent.clientY - startY
      setLayout(normalizeSpotifyPlayerLayout({
        ...startLayout,
        width: startLayout.width + (startLayout.corner === 'left' ? horizontalDelta : -horizontalDelta),
        height: startLayout.height - verticalDelta,
      }))
    }
    const finish = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      resizeCleanup.current = null
      setLayout((current) => {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(current))
        return current
      })
    }
    resizeCleanup.current = finish
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }

  async function connectSpotify() {
    setBusy(true)
    setError('')
    try {
      await beginSpotifyAuthorization()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start Spotify login.')
      setBusy(false)
    }
  }

  async function playOnTv() {
    if (!player.current || !deviceId.current) return
    const currentOperation = operationId.current + 1
    operationId.current = currentOperation
    setBusy(true)
    setError('')
    try {
      await player.current.activateElement()
      const response = await spotifyApi('/me/player', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: [deviceId.current], play: true }),
      })
      if (!response.ok) {
        if (response.status === 403) throw new Error('Spotify Premium is required to transfer playback.')
        if (response.status === 429) throw new Error('Spotify is receiving too many requests. Wait a moment and try again.')
        throw new Error('Could not transfer Spotify playback to this TV.')
      }
      if (currentOperation !== operationId.current) return
      setStatus('Playback transferred. If nothing plays, start a song in Spotify and try again.')
      window.setTimeout(async () => {
        const state = await player.current?.getCurrentState()
        if (mounted.current && currentOperation === operationId.current && !state) {
          setStatus('Start a song in Spotify, then click Play on TV again.')
        }
      }, 1200)
    } catch (reason) {
      if (currentOperation === operationId.current) {
        setError(reason instanceof Error ? reason.message : 'Could not play Spotify on this TV.')
      }
    } finally {
      if (currentOperation === operationId.current) setBusy(false)
    }
  }

  async function togglePlayback() {
    if (!player.current) return
    const currentOperation = operationId.current + 1
    operationId.current = currentOperation
    setError('')
    try {
      await player.current.togglePlay()
    } catch (reason) {
      if (currentOperation === operationId.current) {
        setError(reason instanceof Error ? reason.message : 'Could not change Spotify playback.')
      }
    }
  }

  function disconnectSpotify() {
    operationId.current += 1
    player.current?.disconnect()
    clearSpotifyAuthorization()
    setConnected(false)
    setReady(false)
    setActive(false)
    setPlayback(null)
    setBusy(false)
    setError('')
    setStatus('Connect Spotify to play music through this TV.')
  }

  if (!isSpotifyConfigured) return null

  const track = playback?.track_window.current_track
  const artwork = track?.album?.images?.[0]?.url
  const artists = track?.artists.map((artist) => artist.name).join(', ')
  const trackUrl = track?.id ? `https://open.spotify.com/${track.type === 'episode' ? 'episode' : 'track'}/${track.id}` : ''
  const progressPercent = playback?.duration ? Math.min(100, progress / playback.duration * 100) : 0

  return (
    <aside
      className={`spotify-player spotify-player--${layout.corner} ${active ? 'spotify-player--active' : ''}`}
      style={{ width: layout.width, height: layout.height }}
      aria-label="Spotify player"
    >
      <button className="spotify-player__resize" type="button" aria-label="Resize Spotify player" onPointerDown={startResize} />
      <header className="spotify-player__header">
        <strong><span aria-hidden="true" /> Spotify</strong>
        <div>
          <button type="button" onClick={() => saveLayout({ ...layout, corner: layout.corner === 'right' ? 'left' : 'right' })} aria-label={`Move Spotify player to bottom ${layout.corner === 'right' ? 'left' : 'right'}`}>Move {layout.corner === 'right' ? 'left' : 'right'}</button>
          {connected && <button type="button" onClick={disconnectSpotify}>Disconnect</button>}
        </div>
      </header>

      {!connected ? (
        <div className="spotify-player__connect">
          <p>{error || status}</p>
          <button className="spotify-player__primary" type="button" disabled={busy} onClick={connectSpotify}>{busy ? 'Opening Spotify...' : 'Connect Spotify'}</button>
        </div>
      ) : track ? (
        <div className="spotify-player__track">
          {artwork ? <img src={artwork} alt="" /> : <div className="spotify-player__artwork" aria-hidden="true" />}
          <div className="spotify-player__metadata">
            {trackUrl ? <a href={trackUrl} target="_blank" rel="noreferrer">{track.name}</a> : <strong>{track.name}</strong>}
            <span>{artists || track.album?.name || 'Spotify'}</span>
            <div className="spotify-player__progress" aria-label={`${formatTime(progress)} of ${formatTime(playback.duration)}`}><span style={{ width: `${progressPercent}%` }} /></div>
            <small>{formatTime(progress)} / {formatTime(playback.duration)}</small>
          </div>
          <button className="spotify-player__play" type="button" aria-label={playback.paused ? 'Play Spotify' : 'Pause Spotify'} onClick={togglePlayback}><PlayIcon paused={playback.paused} /></button>
        </div>
      ) : (
        <div className="spotify-player__connect">
          <p className={error ? 'spotify-player__error' : ''}>{error || status}</p>
          <button className="spotify-player__primary" type="button" disabled={!ready || busy} onClick={playOnTv}>{busy ? 'Connecting TV...' : ready ? 'Play on TV' : 'Starting player...'}</button>
        </div>
      )}
      {connected && track && error && <p className="spotify-player__toast">{error}</p>}
    </aside>
  )
}
