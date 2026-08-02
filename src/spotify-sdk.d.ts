declare namespace Spotify {
  interface WebPlaybackTrack {
    album?: {
      images?: Array<{ url: string }>
      name?: string
    }
    artists: Array<{ name: string }>
    id: string | null
    name: string
    type: 'track' | 'episode' | 'ad'
    uri: string
  }

  interface WebPlaybackState {
    duration: number
    paused: boolean
    position: number
    track_window: {
      current_track: WebPlaybackTrack
    }
  }

  interface PlayerOptions {
    enableMediaSession?: boolean
    getOAuthToken: (callback: (token: string) => void) => void
    name: string
    volume?: number
  }

  class Player {
    constructor(options: PlayerOptions)
    activateElement(): Promise<void>
    addListener(event: 'ready' | 'not_ready', callback: (event: { device_id: string }) => void): boolean
    addListener(event: 'player_state_changed', callback: (state: WebPlaybackState | null) => void): boolean
    addListener(event: 'autoplay_failed', callback: () => void): boolean
    addListener(event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error', callback: (event: { message: string }) => void): boolean
    connect(): Promise<boolean>
    disconnect(): void
    getCurrentState(): Promise<WebPlaybackState | null>
    getVolume(): Promise<number>
    removeListener(event: string): boolean
    setVolume(volume: number): Promise<void>
    togglePlay(): Promise<void>
  }
}

interface Window {
  Spotify?: { Player: typeof Spotify.Player }
  onSpotifyWebPlaybackSDKReady?: () => void
}
