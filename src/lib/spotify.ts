const SPOTIFY_ACCOUNTS_URL = 'https://accounts.spotify.com'
const SPOTIFY_API_URL = 'https://api.spotify.com/v1'
const TOKEN_STORAGE_PREFIX = 'house-photo-hunt.spotify.tokens.'
const VERIFIER_STORAGE_KEY = 'house-photo-hunt.spotify.verifier'
const STATE_STORAGE_KEY = 'house-photo-hunt.spotify.state'
const RETURN_STORAGE_KEY = 'house-photo-hunt.spotify.return-url'
const AUTHORIZATION_REVISION_KEY = 'house-photo-hunt.spotify.authorization-revision'
const TOKEN_REFRESH_BUFFER_MS = 60_000

const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? ''

interface SpotifyTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope: string
}

interface SpotifyTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  revision: string
  scope: string
}

export interface SpotifyAuthorizationResult {
  error: string
  handled: boolean
}

let refreshRequest: Promise<string> | null = null
let authorizationGeneration = 0

export const isSpotifyConfigured = Boolean(spotifyClientId)

function randomString(length: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
}

async function createCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function spotifyRedirectUri(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}play/`
}

function readTokens(): SpotifyTokens | null {
  try {
    const revision = localStorage.getItem(AUTHORIZATION_REVISION_KEY)
    if (!revision) return null
    const stored = localStorage.getItem(`${TOKEN_STORAGE_PREFIX}${revision}`)
    if (!stored) return null
    const tokens = JSON.parse(stored) as Partial<SpotifyTokens>
    if (!tokens.accessToken || !tokens.refreshToken || !tokens.expiresAt || !tokens.revision) return null
    if (tokens.revision !== localStorage.getItem(AUTHORIZATION_REVISION_KEY)) return null
    return tokens as SpotifyTokens
  } catch {
    return null
  }
}

function storeTokens(response: SpotifyTokenResponse, revision: string, previousRefreshToken = ''): SpotifyTokens {
  const tokens: SpotifyTokens = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? previousRefreshToken,
    expiresAt: Date.now() + response.expires_in * 1000,
    revision,
    scope: response.scope,
  }
  writeTokens(tokens)
  return tokens
}

function writeTokens(tokens: SpotifyTokens): void {
  const key = `${TOKEN_STORAGE_PREFIX}${tokens.revision}`
  localStorage.setItem(key, JSON.stringify(tokens))
  if (tokens.revision !== localStorage.getItem(AUTHORIZATION_REVISION_KEY)) {
    localStorage.removeItem(key)
  }
}

function rotateAuthorizationRevision(): string {
  const previousRevision = localStorage.getItem(AUTHORIZATION_REVISION_KEY)
  const revision = randomString(32)
  localStorage.setItem(AUTHORIZATION_REVISION_KEY, revision)
  if (previousRevision) localStorage.removeItem(`${TOKEN_STORAGE_PREFIX}${previousRevision}`)
  return revision
}

async function tokenRequest(body: URLSearchParams): Promise<SpotifyTokenResponse> {
  const response = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const payload = await response.json() as SpotifyTokenResponse & { error?: string; error_description?: string }
  if (!response.ok) {
    const error = new Error(payload.error_description ?? payload.error ?? 'Spotify authorization failed.')
    if (payload.error === 'invalid_grant') clearSpotifyAuthorization()
    throw error
  }
  return payload
}

function safeReturnUrl(): string {
  const stored = sessionStorage.getItem(RETURN_STORAGE_KEY)
  sessionStorage.removeItem(RETURN_STORAGE_KEY)
  if (!stored || !stored.startsWith(import.meta.env.BASE_URL)) {
    return `${import.meta.env.BASE_URL}play/?display`
  }
  return stored
}

export function isSpotifyTokenFresh(expiresAt: number, now = Date.now()): boolean {
  return expiresAt - TOKEN_REFRESH_BUFFER_MS > now
}

export function hasSpotifyAuthorization(): boolean {
  return Boolean(readTokens())
}

export function hasSpotifyAuthorizationCallback(search = window.location.search): boolean {
  const params = new URLSearchParams(search)
  return Boolean((params.has('code') || params.has('error')) && params.has('state'))
}

export async function beginSpotifyAuthorization(): Promise<void> {
  if (!spotifyClientId) throw new Error('Spotify is not configured for this deployment.')
  const verifier = randomString(96)
  const state = randomString(48)
  const challenge = await createCodeChallenge(verifier)
  sessionStorage.setItem(VERIFIER_STORAGE_KEY, verifier)
  sessionStorage.setItem(STATE_STORAGE_KEY, state)
  sessionStorage.setItem(RETURN_STORAGE_KEY, `${location.pathname}${location.search}${location.hash}`)

  const authorizeUrl = new URL(`${SPOTIFY_ACCOUNTS_URL}/authorize`)
  authorizeUrl.search = new URLSearchParams({
    client_id: spotifyClientId,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: spotifyRedirectUri(),
    response_type: 'code',
    scope: 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state',
    state,
  }).toString()
  location.assign(authorizeUrl.toString())
}

export async function completeSpotifyAuthorization(): Promise<SpotifyAuthorizationResult> {
  if (!hasSpotifyAuthorizationCallback()) return { error: '', handled: false }
  const params = new URLSearchParams(location.search)
  const expectedState = sessionStorage.getItem(STATE_STORAGE_KEY)
  const verifier = sessionStorage.getItem(VERIFIER_STORAGE_KEY)
  const returnedState = params.get('state')
  const code = params.get('code')
  let error = ''

  try {
    if (!expectedState || !verifier || returnedState !== expectedState) {
      throw new Error('Spotify login could not be verified. Please try connecting again.')
    }
    if (params.get('error')) throw new Error('Spotify login was cancelled.')
    if (!code) throw new Error('Spotify did not return an authorization code.')
    const response = await tokenRequest(new URLSearchParams({
      client_id: spotifyClientId,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: spotifyRedirectUri(),
    }))
    const revision = rotateAuthorizationRevision()
    storeTokens(response, revision)
  } catch (reason) {
    error = reason instanceof Error ? reason.message : 'Could not connect Spotify.'
  } finally {
    sessionStorage.removeItem(VERIFIER_STORAGE_KEY)
    sessionStorage.removeItem(STATE_STORAGE_KEY)
    history.replaceState(history.state, '', safeReturnUrl())
  }

  return { error, handled: true }
}

export async function getSpotifyAccessToken(): Promise<string> {
  const tokens = readTokens()
  if (!tokens) throw new Error('Connect Spotify to continue.')
  if (isSpotifyTokenFresh(tokens.expiresAt)) return tokens.accessToken
  if (refreshRequest) return refreshRequest

  const generation = authorizationGeneration
  const revision = localStorage.getItem(AUTHORIZATION_REVISION_KEY)
  refreshRequest = tokenRequest(new URLSearchParams({
    client_id: spotifyClientId,
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
  })).then((response) => {
    if (generation !== authorizationGeneration || revision !== localStorage.getItem(AUTHORIZATION_REVISION_KEY)) {
      throw new Error('Spotify was disconnected.')
    }
    return storeTokens(response, tokens.revision, tokens.refreshToken).accessToken
  })
    .finally(() => { refreshRequest = null })
  return refreshRequest
}

export async function spotifyApi(path: string, init: RequestInit = {}): Promise<Response> {
  const request = async () => fetch(`${SPOTIFY_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await getSpotifyAccessToken()}`,
      ...init.headers,
    },
  })
  let response = await request()
  if (response.status === 401) {
    const tokens = readTokens()
    if (tokens) {
      tokens.expiresAt = 0
      writeTokens(tokens)
      response = await request()
    }
  }
  return response
}

export function clearSpotifyAuthorization(): void {
  authorizationGeneration += 1
  rotateAuthorizationRevision()
}
