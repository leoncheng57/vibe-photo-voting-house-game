export type SpotifyPlayerCorner = 'left' | 'right'

export interface SpotifyPlayerLayout {
  corner: SpotifyPlayerCorner
  height: number
  minimized: boolean
  width: number
}

export const defaultSpotifyPlayerLayout: SpotifyPlayerLayout = {
  corner: 'right',
  height: 156,
  minimized: false,
  width: 390,
}

const MIN_WIDTH = 300
const MAX_WIDTH = 560
const MIN_HEIGHT = 132
const MAX_HEIGHT = 280

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export function normalizeSpotifyPlayerLayout(
  layout: Partial<SpotifyPlayerLayout>,
  viewportWidth?: number,
  viewportHeight?: number,
): SpotifyPlayerLayout {
  const availableWidth = viewportWidth ?? (typeof window === 'undefined' ? 1920 : window.innerWidth)
  const availableHeight = viewportHeight ?? (typeof window === 'undefined' ? 1080 : window.innerHeight)
  const maximumWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, availableWidth - 32))
  const maximumHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, availableHeight - 130))
  return {
    corner: layout.corner === 'left' ? 'left' : 'right',
    height: clamp(Number(layout.height) || defaultSpotifyPlayerLayout.height, MIN_HEIGHT, maximumHeight),
    minimized: layout.minimized === true,
    width: clamp(Number(layout.width) || defaultSpotifyPlayerLayout.width, MIN_WIDTH, maximumWidth),
  }
}

export function parseSpotifyPlayerLayout(value: string | null): SpotifyPlayerLayout {
  if (!value) return { ...defaultSpotifyPlayerLayout }
  try {
    return normalizeSpotifyPlayerLayout(JSON.parse(value) as Partial<SpotifyPlayerLayout>)
  } catch {
    return { ...defaultSpotifyPlayerLayout }
  }
}
