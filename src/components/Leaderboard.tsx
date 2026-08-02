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
          <span className="eyebrow">Most votes wins / Eternal house glory</span>
          <h2>The<br />leaderboard.</h2>
        </div>
        <p>Every vote received across every challenge counts toward the total. Tied totals share the same rank.</p>
      </header>
      {error && <div className="notice notice--error">{error}</div>}
      <ol className="leaderboard">
        {rankedEntries.map((entry) => {
          const podiumClass = highlightPodium && entry.rank <= 3 ? ` leaderboard__entry--rank-${entry.rank}` : ''
          return <li className={podiumClass.trim() || undefined} key={entry.user_id}>
            <span className="leaderboard__rank">{String(entry.rank).padStart(2, '0')}</span>
            <strong>{entry.display_name}</strong>
            <span>{entry.wins} {entry.wins === 1 ? 'win' : 'wins'}</span>
            <b>{entry.votes}<small> {entry.votes === 1 ? 'vote' : 'votes'}</small></b>
          </li>
        })}
      </ol>
      {!entries.length && !error && <div className="empty-state">No players yet.</div>}
    </div>
  )
}
