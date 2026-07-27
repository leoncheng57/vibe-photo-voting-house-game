export interface ScoredPhoto {
  id: string
  votes: number
  rank: number
  points: number
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
