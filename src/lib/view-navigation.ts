import type { View } from '../types'

const viewKeys = ['display', 'tutorial', 'vote'] as const
const queryKeyByView: Partial<Record<View, typeof viewKeys[number]>> = {
  display: 'display',
  tutorial: 'tutorial',
  vote: 'vote',
}

export function getViewFromSearch(search: string): View {
  const params = new URLSearchParams(search)
  if (params.has('display')) return 'display'
  if (params.has('tutorial')) return 'tutorial'
  if (params.has('vote')) return 'vote'
  return 'challenges'
}

export function getViewUrl(pathname: string, search: string, hash: string, view: View): string {
  const params = new URLSearchParams(search)
  viewKeys.forEach((key) => params.delete(key))

  const queryParts: string[] = []
  const viewKey = queryKeyByView[view]
  if (viewKey) queryParts.push(viewKey)

  const remaining = params.toString()
  if (remaining) queryParts.push(remaining)

  return `${pathname}${queryParts.length ? `?${queryParts.join('&')}` : ''}${hash}`
}
