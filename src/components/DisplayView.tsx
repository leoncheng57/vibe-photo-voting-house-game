import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { Challenge, Submission } from '../types'
import { getSubmissions } from '../lib/api'
import { Timer } from './Timer'

export function DisplayView({ challenges, refreshToken, onExit }: { challenges: Challenge[]; refreshToken: number; onExit: () => void }) {
  const [index, setIndex] = useState(0)
  const [photos, setPhotos] = useState<Submission[]>([])
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState('')
  const challenge = challenges[index]
  const joinUrl = useMemo(() => `${window.location.origin}${import.meta.env.BASE_URL}`, [])

  useEffect(() => {
    if (!challenge) return
    let current = true
    setRevealed(false)
    getSubmissions(challenge.id)
      .then((nextPhotos) => { if (current) setPhotos(nextPhotos) })
      .catch((reason: Error) => { if (current) setError(reason.message) })
    return () => { current = false }
  }, [challenge, refreshToken])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') setIndex((current) => (current - 1 + challenges.length) % challenges.length)
      if (event.key === 'ArrowRight') setIndex((current) => (current + 1) % challenges.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [challenges.length])

  const sorted = revealed
    ? [...photos].sort((a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0))
    : photos

  function move(delta: number) {
    setIndex((current) => (current + delta + challenges.length) % challenges.length)
  }

  async function toggleResults() {
    if (revealed) {
      setRevealed(false)
      return
    }
    try {
      setPhotos(await getSubmissions(challenge.id))
      setRevealed(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not refresh results.')
    }
  }

  if (!challenge) return null

  return (
    <div className="display-view">
      <header className="display-header">
        <button className="brand brand--display brand--button" onClick={onExit}><b>HOUSE</b><span>EXIT TV MODE</span></button>
        <Timer compact />
        <div className="display-join">
          <span>Scan to play</span>
          <QRCodeSVG value={joinUrl} size={74} bgColor="transparent" fgColor="#111111" />
        </div>
      </header>

      <section className="display-title">
        <button aria-label="Previous challenge" onClick={() => move(-1)}>←</button>
        <div>
          <span className="eyebrow">Challenge {String(index + 1).padStart(2, '0')} / {String(challenges.length).padStart(2, '0')}</span>
          <h2>{challenge.title}</h2>
          <p>{challenge.prompt}</p>
        </div>
        <button aria-label="Next challenge" onClick={() => move(1)}>→</button>
      </section>

      {error && <div className="notice notice--error">{error}</div>}
      <div className={`photo-grid photo-grid--display ${revealed ? 'revealed' : ''}`}>
        {sorted.map((photo, photoIndex) => (
          <figure key={photo.id}>
            <img src={photo.photoUrl} alt={`Submission ${photoIndex + 1}`} />
            <figcaption>
              {revealed ? <><strong>{photo.ownerName}</strong><span>{photo.voteCount} votes</span></> : <span>Photo {photoIndex + 1}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
      {!photos.length && <div className="empty-state">Photos will appear here.</div>}

      <footer className="display-footer">
        <span>{photos.length} submissions</span>
        <button className="button button--dark" onClick={toggleResults}>
          {revealed ? 'Hide results' : 'Reveal results'}
        </button>
        <span>Use ← → to move</span>
      </footer>
    </div>
  )
}
