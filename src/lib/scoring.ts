export interface ScoredPhoto {
  id: string
  votes: number
  rank: number
}

export function rankLeaderboardEntries<T extends { votes: number }>(entries: T[]): Array<T & { rank: number }> {
  let previousVotes: number | undefined
  let rank = 0

  return entries.map((entry, index) => {
    if (entry.votes !== previousVotes) rank = index + 1
    previousVotes = entry.votes
    return { ...entry, rank }
  })
}

export function scorePhotos(photos: Array<{ id: string; votes: number }>): ScoredPhoto[] {
  const sorted = [...photos].sort((a, b) => b.votes - a.votes || a.id.localeCompare(b.id))
  let previousVotes: number | undefined
  let rank = 0

  return sorted.map((photo, index) => {
    if (photo.votes !== previousVotes) rank = index + 1
    previousVotes = photo.votes

    return {
      ...photo,
      rank,
    }
  })
}

export function getWinningPhotoIds(photos: Array<{ id: string; votes: number }>): string[] {
  return scorePhotos(photos)
    .filter((photo) => photo.rank === 1 && photo.votes > 0)
    .map((photo) => photo.id)
}

// Under the 'random' winner mode vote totals no longer decide anything, so the
// leaderboard ranks on wins instead. Unlike rankLeaderboardEntries this sorts,
// because the API orders rows by votes.
export function rankLeaderboardEntriesByWins<T extends { wins: number }>(entries: T[]): Array<T & { rank: number }> {
  const sorted = [...entries].sort((a, b) => b.wins - a.wins)
  let previousWins: number | undefined
  let rank = 0

  return sorted.map((entry, index) => {
    if (entry.wins !== previousWins) rank = index + 1
    previousWins = entry.wins
    return { ...entry, rank }
  })
}
