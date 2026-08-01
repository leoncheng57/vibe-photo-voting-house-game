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
  submissionId: string
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
  originalStatus: OriginalStatus
  originalSourceBytes: number | null
}

export interface LeaderboardEntry {
  user_id: string
  display_name: string
  points: number
  wins: number
}

export type View = 'challenges' | 'tutorial' | 'palette' | 'vote' | 'display'
