import { useEffect, useState } from 'react'
import type { Challenge, Submission } from '../types'
import { getSubmissions, getVotes, submitVotes } from '../lib/api'

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
        setSaved(votes.length === 3)
      })
      .catch((error: Error) => { if (current) setMessage(error.message) })
    return () => { current = false }
  }, [challengeId, userId, refreshToken])

  function toggle(id: string) {
    setSaved(false)
    setSelected((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : current.length < 3 ? [...current, id] : current)
  }

  async function saveVotes() {
    setBusy(true)
    setMessage('')
    try {
      await submitVotes(challengeId, selected)
      setSaved(true)
      setMessage('Three votes locked in. You can still change them later.')
      onChanged()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save votes.')
    } finally {
      setBusy(false)
    }
  }

  const challenge = challenges.find((item) => item.id === challengeId)

  return (
    <div>
      <header className="section-heading section-heading--vote">
        <div>
          <span className="eyebrow">02 / Choose your favorites</span>
          <h2>Three votes.<br />Make them count.</h2>
        </div>
        <p>Pick three different photos in every challenge. Your own photo is fair game.</p>
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
        <strong>{selected.length}<small>/3 selected</small></strong>
        <button className="button button--dark" disabled={selected.length !== 3 || busy} onClick={saveVotes}>
          {busy ? 'Saving…' : saved ? 'Votes saved' : 'Confirm 3 votes'}
        </button>
      </div>

      {message && <div className="notice" role="status">{message}</div>}
      {submissions.length < 3 ? (
        <div className="empty-state">
          <strong>Not enough photos yet.</strong>
          <p>This challenge needs at least three submissions before anyone can vote.</p>
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
