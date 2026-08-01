export interface ScoredPhoto {
  id: string
  votes: number
  rank: number
  points: number
}

export function rankLeaderboardEntries<T extends { points: number; wins: number }>(entries: T[]): Array<T & { rank: number }> {
  let previous: T | undefined
  let rank = 0

  return entries.map((entry, index) => {
    if (!previous || entry.points !== previous.points || entry.wins !== previous.wins) rank = index + 1
    previous = entry
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
      points: photo.votes > 0 && rank <= 3 ? 4 - rank : 0,
    }
  })
}
