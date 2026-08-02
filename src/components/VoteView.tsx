import { useEffect, useState } from 'react'
import type { Challenge, Submission } from '../types'
import { getSubmissions, getVotes, submitVotes } from '../lib/api'
import { errorMessage } from '../lib/errors'
import { canSubmitVotes, getVoteLimit } from '../lib/voting'

interface Props {
  challenges: Challenge[]
  userId: string
  refreshToken: number
  onChanged: () => void
}

export function VoteView({ challenges, userId, refreshToken, onChanged }: Props) {
  const [challengeId, setChallengeId] = useState(challenges[0]?.id ?? 1)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let current = true
    setMessage('')
    Promise.all([getSubmissions(challengeId), getVotes(challengeId)])
      .then(([photos, votes]) => {
        if (!current) return
        setSubmissions(photos)
        setSelected(votes)
        setSaved(votes.length > 0)
      })
      .catch((error: Error) => { if (current) setMessage(error.message) })
    return () => { current = false }
  }, [challengeId, userId, refreshToken])

  function toggle(id: string) {
    const voteLimit = getVoteLimit(submissions.length)
    setSaved(false)
    setSelected((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < voteLimit ? [...current, id] : current)
  }

  async function saveVotes() {
    setBusy(true)
    setMessage('')
    try {
      await submitVotes(challengeId, selected.map((id) => {
        const submission = submissions.find((item) => item.id === id)
        if (!submission) throw new Error('A selected photo is no longer available.')
        return { id, storagePath: submission.storage_path }
      }))
      setSaved(true)
      setMessage(selected.length
        ? `${selected.length === 1 ? 'Vote' : 'Votes'} locked in. You can still change them later.`
        : 'Votes cleared. You can choose favorites again later.')
      onChanged()
    } catch (error) {
      setMessage(errorMessage(error, 'Could not save votes.'))
    } finally {
      setBusy(false)
    }
  }

  const challenge = challenges.find((item) => item.id === challengeId)
  const voteLimit = getVoteLimit(submissions.length)

  return (
    <div>
      <header className="section-heading section-heading--vote">
        <div>
          <span className="eyebrow">02 / Choose your favorites</span>
          <h2>Up to three.<br />Make them count.</h2>
        </div>
        <p>Submit up to three favorites. Every choice is worth one vote, your own photo is fair game, and confirming zero votes clears your ballot.</p>
      </header>

      <div className="challenge-tabs" aria-label="Choose a challenge">
        {challenges.map((item, index) => (
          <button
            key={item.id}
            className={challengeId === item.id ? 'active' : ''}
            onClick={() => setChallengeId(item.id)}
          >
            {index + 1}<span>{item.title}</span>
          </button>
        ))}
      </div>

      <div className="vote-bar">
        <div>
          <span className="eyebrow">Now voting</span>
          <h3>{challenge?.title}</h3>
        </div>
        <strong>{selected.length}<small>/{voteLimit} max</small></strong>
        <button className="button button--dark" disabled={!canSubmitVotes(selected.length, submissions.length) || busy} onClick={saveVotes}>
          {busy ? 'Saving…' : saved ? (selected.length ? 'Votes saved' : '0 votes saved') : `Confirm ${selected.length} ${selected.length === 1 ? 'vote' : 'votes'}`}
        </button>
      </div>

      {message && <div className="notice" role="status">{message}</div>}
      {submissions.length === 0 ? (
        <div className="empty-state">
          <strong>No photos yet.</strong>
          <p>The first submission will appear here immediately.</p>
        </div>
      ) : (
        <div className="photo-grid photo-grid--vote">
          {submissions.map((photo) => {
            const selectedIndex = selected.indexOf(photo.id)
            return (
              <button
                className={`photo-choice ${selectedIndex >= 0 ? 'selected' : ''}`}
                key={photo.id}
                onClick={() => toggle(photo.id)}
                aria-pressed={selectedIndex >= 0}
              >
                <img src={photo.photoUrl} alt="Anonymous challenge submission" />
                <span>{selectedIndex >= 0 ? selectedIndex + 1 : '+'}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
