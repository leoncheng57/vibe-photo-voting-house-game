import { useEffect, useState } from 'react'
import { getStorageUsage } from './api'
import { summarizeStorage, type StorageSummary } from './photo-policy'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

export interface StorageUsageState {
  summary: StorageSummary | null
  failed: boolean
}

/**
 * Aggregate storage usage for the meter. Refreshes on mount, whenever
 * refreshToken changes (uploads and realtime submission events), and every
 * five minutes while the page stays open. Failures leave the previous
 * summary in place and flag the meter as unavailable.
 */
export function useStorageUsage(enabled: boolean, refreshToken: number): StorageUsageState {
  const [state, setState] = useState<StorageUsageState>({ summary: null, failed: false })

  useEffect(() => {
    if (!enabled) return
    let active = true

    async function refresh() {
      try {
        const buckets = await getStorageUsage()
        if (active) setState({ summary: summarizeStorage(buckets), failed: false })
      } catch {
        if (active) setState((previous) => ({ summary: previous.summary, failed: true }))
      }
    }

    void refresh()
    const interval = setInterval(() => { void refresh() }, REFRESH_INTERVAL_MS)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [enabled, refreshToken])

  return state
}
