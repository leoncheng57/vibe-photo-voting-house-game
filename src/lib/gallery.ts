import type { Submission } from '../types'

export function sortGallerySubmissions(submissions: Submission[]) {
  return [...submissions].sort((a, b) => {
    const createdDifference = Date.parse(b.created_at) - Date.parse(a.created_at)
    return createdDifference || a.id.localeCompare(b.id)
  })
}
