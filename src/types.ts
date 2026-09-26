export interface Profile {
  user_id: string
  display_name: string
}

export interface PartyStatus {
  is_open: boolean
  is_member: boolean
}

export interface Challenge {
  id: number
  slug: string
  title: string
  prompt: string
  kicker: string
  sort_order: number
}

export interface Submission {
  id: string
  challenge_id: number
  user_id: string
  storage_path: string
  created_at: string
  photoUrl?: string
  ownerName?: string
  voteCount?: number
}

export interface StorageUsage {
  bucketId: string
  totalBytes: number
  objectCount: number
}

export type OriginalStatus = 'exact' | 'optimized' | 'resized' | 'legacy'

export interface OriginalRecord {
  versionId: string
  submissionId: string | null
  challengeId: number
  challengeSlug: string
  challengeTitle: string
  challengeSortOrder: number
  userId: string
  ownerName: string
  originalPath: string
  originalFilename: string
  originalMime: string
  originalBytes: number
  originalWidth: number | null
  originalHeight: number | null
  originalStatus: OriginalStatus
  originalSourceBytes: number | null
  originalSourceMime: string | null
  versionState: 'pending' | 'ready'
  isCurrent: boolean
  createdAt: string
}

export interface OriginalCleanupStatus {
  versionId: string
  originalPath: string
  approved: boolean
  objectExists: boolean
  deletionRecorded: boolean
}

export interface LeaderboardEntry {
  user_id: string
  display_name: string
  votes: number
  wins: number
}

export type WinnerMode = 'voting' | 'random'

// Host-configurable palette. Keys are stable contract; see
// config/settings-defaults.ts for the CSS custom property each one maps to.
export interface ThemeTokens {
  ink: string
  sky: string
  pool: string
  powder: string
  ice: string
  paper: string
  alert: string
  accentBlue: string
  accentGreen: string
}

export interface GameSettings {
  theme: ThemeTokens
  winnerMode: WinnerMode
}

// A winner is whoever the active strategy picks; under 'voting' that is the
// top-voted photo, under 'random' it is a uniform draw over entrants.
export interface WinnerPick {
  submissionId: string
  ownerName: string | null
  voteCount: number | null
  mode: WinnerMode
}

export type View = 'challenges' | 'tutorial' | 'vote' | 'display' | 'settings'
