import { useEffect, useState } from 'react'
import { getLeaderboard, getSubmissions } from '../lib/api'
import { rankLeaderboardEntries, rankLeaderboardEntriesByWins } from '../lib/scoring'
import { areVoteScoresMeaningful, countRandomDrawWins } from '../lib/winner'
import { DEFAULT_WINNER_MODE } from '../config/settings-defaults'
import { APPS } from '../config/apps'
import { getActiveAppId } from '../lib/active-app'
import type { LeaderboardEntry, WinnerMode } from '../types'

const activeApp = APPS[getActiveAppId()]

interface Props {
  refreshToken: number
  highlightPodium?: boolean
  winnerMode?: WinnerMode
}

export function Leaderboard({ refreshToken, highlightPodium = false, winnerMode = DEFAULT_WINNER_MODE }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [error, setError] = useState('')

  const showVotes = areVoteScoresMeaningful(winnerMode)

  useEffect(() => {
    // The leaderboard view counts wins from votes. A random draw is never stored,
    // so in that mode the wins are replayed from the same seeded draw the TV shows.
    const load = () => showVotes
      ? getLeaderboard()
      : Promise.all([getLeaderboard(), getSubmissions()]).then(([rows, submissions]) => {
        const wins = countRandomDrawWins(submissions)
        return rows.map((row) => ({ ...row, wins: wins.get(row.user_id) ?? 0 }))
      })
    const refresh = () => load().then(setEntries).catch((reason: Error) => setError(reason.message))
    void refresh()
    const interval = window.setInterval(refresh, 5000)
    return () => window.clearInterval(interval)
  }, [refreshToken, showVotes])
  const rankedEntries = showVotes ? rankLeaderboardEntries(entries) : rankLeaderboardEntriesByWins(entries)

  return (
    <div>
      <header className="section-heading section-heading--leaderboard">
        <div>
          <span className="eyebrow">{showVotes ? 'Most votes wins' : 'Luck of the draw'} / {activeApp.copy.glory}</span>
          <h2>The<br />leaderboard.</h2>
        </div>
        <p>
          {showVotes
            ? 'Every vote received across every challenge counts toward the total. Tied totals share the same rank.'
            : 'Winners are drawn at random, so votes are not counted here. Challenge wins are the only score. Tied totals share the same rank.'}
        </p>
      </header>
      {error && <div className="notice notice--error">{error}</div>}
      <ol className="leaderboard">
        {rankedEntries.map((entry) => {
          const podiumClass = highlightPodium && entry.rank <= 3 ? ` leaderboard__entry--rank-${entry.rank}` : ''
          return <li className={podiumClass.trim() || undefined} key={entry.user_id}>
            <span className="leaderboard__rank">{String(entry.rank).padStart(2, '0')}</span>
            <strong>{entry.display_name}</strong>
            {showVotes
              ? <span>{entry.wins} {entry.wins === 1 ? 'win' : 'wins'}</span>
              : <span>Random winner mode</span>}
            {showVotes
              ? <b>{entry.votes}<small> {entry.votes === 1 ? 'vote' : 'votes'}</small></b>
              : <b>{entry.wins}<small> {entry.wins === 1 ? 'win' : 'wins'}</small></b>}
          </li>
        })}
      </ol>
      {!entries.length && !error && <div className="empty-state">No players yet.</div>}
    </div>
  )
}
