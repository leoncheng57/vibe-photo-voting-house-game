export interface Profile {
  user_id: string
  display_name: string
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

export interface LeaderboardEntry {
  user_id: string
  display_name: string
  points: number
  wins: number
}

export type View = 'challenges' | 'tutorial' | 'palette' | 'vote' | 'leaderboard' | 'display'
