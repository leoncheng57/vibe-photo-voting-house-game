import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { Challenge, Submission } from '../types'
import { getSubmissions } from '../lib/api'
import { Timer } from './Timer'
import { Tutorial } from './Tutorial'
import { Leaderboard } from './Leaderboard'

const PAGE_DURATION_SECONDS = 30
const PAGE_DURATION_MS = PAGE_DURATION_SECONDS * 1000
type DisplayPage = 'gallery' | 'voting' | 'tutorial' | 'scores'

export function DisplayView({ challenges, refreshToken, onExit }: { challenges: Challenge[]; refreshToken: number; onExit: () => void }) {
  const [index, setIndex] = useState(0)
  const [photos, setPhotos] = useState<Submission[]>([])
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState<DisplayPage>('gallery')
  const [pageSeconds, setPageSeconds] = useState(PAGE_DURATION_SECONDS)
  const pageEndsAt = useRef(Date.now() + PAGE_DURATION_MS)
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
    if (!challenges.length || page !== 'gallery') return
    pageEndsAt.current = Date.now() + PAGE_DURATION_MS
    setPageSeconds(PAGE_DURATION_SECONDS)
    setIndex((current) => Math.min(current, challenges.length - 1))

    const interval = window.setInterval(() => {
      const now = Date.now()
      if (now >= pageEndsAt.current) {
        setIndex((current) => (current + 1) % challenges.length)
        pageEndsAt.current = now + PAGE_DURATION_MS
        setPageSeconds(PAGE_DURATION_SECONDS)
        return
      }
      setPageSeconds(Math.ceil((pageEndsAt.current - now) / 1000))
    }, 250)

    return () => window.clearInterval(interval)
  }, [challenges.length, page])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const delta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
      if (!delta || !challenges.length || (page !== 'gallery' && page !== 'voting')) return
      pageEndsAt.current = Date.now() + PAGE_DURATION_MS
      setPageSeconds(PAGE_DURATION_SECONDS)
      setIndex((current) => (current + delta + challenges.length) % challenges.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [challenges.length, page])

  const sorted = revealed
    ? [...photos].sort((a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0))
    : photos
  const voteTarget = Math.min(3, photos.length)

  function move(delta: number) {
    if (!challenges.length) return
    pageEndsAt.current = Date.now() + PAGE_DURATION_MS
    setPageSeconds(PAGE_DURATION_SECONDS)
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

  function selectPage(nextPage: DisplayPage) {
    if (nextPage === 'voting') setRevealed(false)
    setPage(nextPage)
  }

  if (!challenge) return null

  return (
    <div className="display-view">
      <header className="display-header">
        <button className="brand brand--display brand--button" onClick={onExit}><b>HOUSE</b><span>EXIT TV MODE</span></button>
        <nav className="display-tabs" aria-label="TV mode views">
          <button type="button" aria-current={page === 'gallery' ? 'page' : undefined} onClick={() => selectPage('gallery')}>Gallery</button>
          <button type="button" aria-current={page === 'voting' ? 'page' : undefined} onClick={() => selectPage('voting')}>Voting</button>
          <button type="button" aria-current={page === 'tutorial' ? 'page' : undefined} onClick={() => selectPage('tutorial')}>How to play</button>
          <button type="button" aria-current={page === 'scores' ? 'page' : undefined} onClick={() => selectPage('scores')}>Scores</button>
        </nav>
        <Timer compact />
        <div className="display-join">
          <span>Scan to play</span>
          <QRCodeSVG value={joinUrl} size={74} bgColor="transparent" fgColor="#111111" />
        </div>
      </header>

      {(page === 'gallery' || page === 'voting') && <>
        <section className="display-title">
          <button type="button" aria-label="Previous challenge" onClick={() => move(-1)}>←</button>
          <div>
            <span className="eyebrow">Challenge {String(index + 1).padStart(2, '0')} / {String(challenges.length).padStart(2, '0')}</span>
            <h2>{challenge.title}</h2>
            <p>{challenge.prompt}</p>
          </div>
          <button type="button" aria-label="Next challenge" onClick={() => move(1)}>→</button>
        </section>

        {page === 'voting' && <section className="display-voting-callout"><span>Voting is open</span><h1>Choose on your phone.</h1><p>{voteTarget ? <>Open <b>Vote</b> and select {voteTarget} {voteTarget === 1 ? 'favorite' : 'favorites'} for this challenge.</> : 'Photos will appear here as guests submit them.'}</p></section>}
        {error && <div className="notice notice--error">{error}</div>}
        <div className={`photo-grid photo-grid--display ${page === 'gallery' && revealed ? 'revealed' : ''}`}>
          {(page === 'gallery' ? sorted : photos).map((photo, photoIndex) => (
            <figure key={photo.id}>
              <img src={photo.photoUrl} alt={`Anonymous submission ${photoIndex + 1} for ${challenge.title}`} />
              <figcaption>
                {page === 'gallery' && revealed ? <><strong>{photo.ownerName}</strong><span>{photo.voteCount} votes</span></> : <span>Photo {photoIndex + 1}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
        {!photos.length && <div className="empty-state">Photos will appear here.</div>}
      </>}

      {page === 'tutorial' && <Tutorial variant="tv" />}
      {page === 'scores' && <section className="display-scores"><Leaderboard refreshToken={refreshToken} /></section>}

      <footer className="display-footer">
        {page === 'gallery' ? <>
          <span>{photos.length} submissions</span>
          <button className="button button--dark" onClick={toggleResults}>{revealed ? 'Hide results' : 'Reveal results'}</button>
          <span>Next in {pageSeconds}s · ← → to move</span>
        </> : page === 'voting' ? <>
          <span>{photos.length} anonymous submissions</span>
          <strong>Waiting for everyone to finish voting…</strong>
          <span>← → to change challenge</span>
        </> : page === 'tutorial' ? <>
          <span>House Photo Hunt</span>
          <strong>Join · Shoot · Vote · Reveal</strong>
          <span>Use the tabs to return to the gallery</span>
        </> : <>
          <span>Final standings</span>
          <strong>Top three choose the prizes</strong>
          <span>Scores update as votes change</span>
        </>}
      </footer>
    </div>
  )
}
