import { useEffect, useRef, useState } from 'react'
import type { Challenge, Submission } from '../types'
import { getSubmissions, uploadSubmission } from '../lib/api'
import { compressPhoto } from '../lib/images'

interface Props {
  challenges: Challenge[]
  userId: string
  refreshToken: number
  onChanged: () => void
}

export function ChallengeList({ challenges, userId, refreshToken, onChanged }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [busyId, setBusyId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  useEffect(() => {
    getSubmissions().then(setSubmissions).catch((error: Error) => setMessage(error.message))
  }, [refreshToken])

  async function selectPhoto(challenge: Challenge, file?: File) {
    if (!file) return
    setBusyId(challenge.id)
    setMessage('')
    try {
      const compressed = await compressPhoto(file)
      await uploadSubmission(userId, challenge.id, compressed)
      setMessage(`Your photo for “${challenge.title}” is in.`)
      setSubmissions(await getSubmissions())
      onChanged()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setBusyId(null)
      const input = inputRefs.current[challenge.id]
      if (input) input.value = ''
    }
  }

  return (
    <div>
      <header className="section-heading">
        <div>
          <span className="eyebrow">01 / Make something memorable</span>
          <h2>Six shots.<br />No bad ideas.</h2>
        </div>
        <p>Join any challenge you like. You can replace your photo until the group starts voting.</p>
      </header>

      {message && <div className="notice" role="status">{message}</div>}

      <div className="challenge-grid">
        {challenges.map((challenge, index) => {
          const own = submissions.find(
            (submission) => submission.challenge_id === challenge.id && submission.user_id === userId,
          )
          const count = submissions.filter((submission) => submission.challenge_id === challenge.id).length
          return (
            <article className={`challenge-card challenge-card--${(index % 4) + 1}`} key={challenge.id}>
              <div className="challenge-card__number">{String(index + 1).padStart(2, '0')}</div>
              <div className="challenge-card__content">
                {own?.photoUrl && (
                  <div className="challenge-card__preview">
                    <img src={own.photoUrl} alt={`Your submission for ${challenge.title}`} />
                  </div>
                )}
                <div className="challenge-card__body">
                  <span className="eyebrow">{challenge.kicker}</span>
                  <h3>{challenge.title}</h3>
                  <p>{challenge.prompt}</p>
                  <div className="challenge-card__footer">
                    <span>{count} {count === 1 ? 'photo' : 'photos'}</span>
                    <button
                      className="button"
                      disabled={busyId !== null}
                      onClick={() => inputRefs.current[challenge.id]?.click()}
                    >
                      {busyId === challenge.id ? 'Preparing…' : own ? 'Replace mine' : 'Add my photo'}
                    </button>
                    <input
                      ref={(element) => { inputRefs.current[challenge.id] = element }}
                      className="visually-hidden"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(event) => selectPhoto(challenge, event.target.files?.[0])}
                    />
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
