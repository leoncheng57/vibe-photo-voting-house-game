import { useEffect, useState } from 'react'
import { getLeaderboard } from '../lib/api'
import { rankLeaderboardEntries } from '../lib/scoring'
import type { LeaderboardEntry } from '../types'

export function Leaderboard({ refreshToken, highlightPodium = false }: { refreshToken: number; highlightPodium?: boolean }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const refresh = () => getLeaderboard().then(setEntries).catch((reason: Error) => setError(reason.message))
    void refresh()
    const interval = window.setInterval(refresh, 5000)
    return () => window.clearInterval(interval)
  }, [refreshToken])

  const rankedEntries = rankLeaderboardEntries(entries)

  return (
    <div>
      <header className="section-heading section-heading--leaderboard">
        <div>
          <span className="eyebrow">03 / Eternal house glory</span>
          <h2>The<br />leaderboard.</h2>
        </div>
        <p>Each challenge awards 3 points for first, 2 for second, and 1 for third. Tied photos share rank points.</p>
      </header>
      {error && <div className="notice notice--error">{error}</div>}
      <ol className="leaderboard">
        {rankedEntries.map((entry) => {
          const podiumClass = highlightPodium && entry.rank <= 3 ? ` leaderboard__entry--rank-${entry.rank}` : ''
          return <li className={podiumClass.trim() || undefined} key={entry.user_id}>
            <span className="leaderboard__rank">{String(entry.rank).padStart(2, '0')}</span>
            <strong>{entry.display_name}</strong>
            <span>{entry.wins} {entry.wins === 1 ? 'win' : 'wins'}</span>
            <b>{entry.points}<small> pts</small></b>
          </li>
        })}
      </ol>
      {!entries.length && !error && <div className="empty-state">No players yet.</div>}
    </div>
  )
}
