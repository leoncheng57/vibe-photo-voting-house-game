import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { Challenge, Submission } from '../types'
import { getSubmissions } from '../lib/api'
import { Timer } from './Timer'
import { Tutorial } from './Tutorial'
import { Leaderboard } from './Leaderboard'

const PAGE_DURATION_SECONDS = 30
const PAGE_DURATION_MS = PAGE_DURATION_SECONDS * 1000
const SCORE_DRAWER_TRANSITION_MS = 320
const SCORE_DRAWER_OPEN_DELAY_MS = 20
type DisplayPage = 'gallery' | 'voting' | 'tutorial'

export function DisplayView({ challenges, refreshToken, onExit }: { challenges: Challenge[]; refreshToken: number; onExit: () => void }) {
  const [index, setIndex] = useState(0)
  const [photos, setPhotos] = useState<Submission[]>([])
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState<DisplayPage>('gallery')
  const [previewPhotoId, setPreviewPhotoId] = useState<string | null>(null)
  const [confirmingScores, setConfirmingScores] = useState(false)
  const [scoresMounted, setScoresMounted] = useState(false)
  const [scoresRevealed, setScoresRevealed] = useState(false)
  const [scoresSettled, setScoresSettled] = useState(false)
  const [hidingScores, setHidingScores] = useState(false)
  const [pageSeconds, setPageSeconds] = useState(PAGE_DURATION_SECONDS)
  const pageEndsAt = useRef(Date.now() + PAGE_DURATION_MS)
  const scoreCloseTimer = useRef<number | null>(null)
  const scoreHideStartTimer = useRef<number | null>(null)
  const scoreOpenTimer = useRef<number | null>(null)
  const scoreSettleTimer = useRef<number | null>(null)
  const previewOpen = useRef(false)
  const previewTrigger = useRef<HTMLButtonElement | null>(null)
  const previewClose = useRef<HTMLButtonElement | null>(null)
  const restorePreviewFocus = useRef(false)
  const challenge = challenges[index]
  const joinUrl = useMemo(() => `${window.location.origin}${import.meta.env.BASE_URL}play/`, [])

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
    if (!challenges.length || page !== 'gallery' || previewPhotoId) return
    pageEndsAt.current = Date.now() + PAGE_DURATION_MS
    setPageSeconds(PAGE_DURATION_SECONDS)
    setIndex((current) => Math.min(current, challenges.length - 1))

    const interval = window.setInterval(() => {
      if (previewOpen.current) return
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
  }, [challenges.length, page, previewPhotoId])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (previewPhotoId) closePhotoPreview()
        else if (confirmingScores) setConfirmingScores(false)
        else if (scoresMounted) hideScores()
        else onExit()
        return
      }
      const delta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
      if (!delta || previewPhotoId || !challenges.length || (page !== 'gallery' && page !== 'voting')) return
      pageEndsAt.current = Date.now() + PAGE_DURATION_MS
      setPageSeconds(PAGE_DURATION_SECONDS)
      setIndex((current) => (current + delta + challenges.length) % challenges.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [challenges.length, confirmingScores, onExit, page, previewPhotoId, scoresMounted])

  useEffect(() => {
    if (previewPhotoId) {
      previewClose.current?.focus()
      return
    }
    if (restorePreviewFocus.current) {
      previewTrigger.current?.focus()
      previewTrigger.current = null
      restorePreviewFocus.current = false
    }
  }, [previewPhotoId])

  useEffect(() => () => {
    if (scoreCloseTimer.current) window.clearTimeout(scoreCloseTimer.current)
    if (scoreHideStartTimer.current) window.clearTimeout(scoreHideStartTimer.current)
    if (scoreOpenTimer.current) window.clearTimeout(scoreOpenTimer.current)
    if (scoreSettleTimer.current) window.clearTimeout(scoreSettleTimer.current)
  }, [])

  const sorted = revealed
    ? [...photos].sort((a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0))
    : photos
  const displayedPhotos = page === 'gallery' ? sorted : photos
  const previewPhoto = previewPhotoId ? photos.find((photo) => photo.id === previewPhotoId) : undefined
  const previewPhotoIndex = previewPhotoId ? displayedPhotos.findIndex((photo) => photo.id === previewPhotoId) : -1
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
    previewOpen.current = false
    restorePreviewFocus.current = false
    setPreviewPhotoId(null)
    previewTrigger.current = null
    if (nextPage === 'voting') setRevealed(false)
    if (nextPage !== 'voting') {
      if (scoreCloseTimer.current) window.clearTimeout(scoreCloseTimer.current)
      if (scoreHideStartTimer.current) window.clearTimeout(scoreHideStartTimer.current)
      if (scoreOpenTimer.current) window.clearTimeout(scoreOpenTimer.current)
      if (scoreSettleTimer.current) window.clearTimeout(scoreSettleTimer.current)
      setConfirmingScores(false)
      setScoresMounted(false)
      setScoresRevealed(false)
      setScoresSettled(false)
      setHidingScores(false)
    }
    setPage(nextPage)
  }

  function openPhotoPreview(photoId: string, trigger: HTMLButtonElement) {
    previewOpen.current = true
    restorePreviewFocus.current = false
    previewTrigger.current = trigger
    setPreviewPhotoId(photoId)
  }

  function closePhotoPreview() {
    previewOpen.current = false
    restorePreviewFocus.current = true
    setPreviewPhotoId(null)
  }

  function revealScores(event: React.FormEvent) {
    event.preventDefault()
    if (scoreCloseTimer.current) window.clearTimeout(scoreCloseTimer.current)
    if (scoreHideStartTimer.current) window.clearTimeout(scoreHideStartTimer.current)
    if (scoreOpenTimer.current) window.clearTimeout(scoreOpenTimer.current)
    if (scoreSettleTimer.current) window.clearTimeout(scoreSettleTimer.current)
    setConfirmingScores(false)
    setHidingScores(false)
    setScoresMounted(true)
    setScoresSettled(false)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setScoresRevealed(true)
      setScoresSettled(true)
      return
    }
    scoreOpenTimer.current = window.setTimeout(() => {
      setScoresRevealed(true)
      scoreOpenTimer.current = null
      scoreSettleTimer.current = window.setTimeout(() => {
        setScoresSettled(true)
        scoreSettleTimer.current = null
      }, SCORE_DRAWER_TRANSITION_MS)
    }, SCORE_DRAWER_OPEN_DELAY_MS)
  }

  function hideScores() {
    if (scoreOpenTimer.current) window.clearTimeout(scoreOpenTimer.current)
    if (scoreSettleTimer.current) window.clearTimeout(scoreSettleTimer.current)
    scoreOpenTimer.current = null
    scoreSettleTimer.current = null
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setScoresMounted(false)
      setScoresRevealed(false)
      setScoresSettled(false)
      return
    }
    setHidingScores(true)
    setScoresSettled(false)
    scoreHideStartTimer.current = window.setTimeout(() => {
      setScoresRevealed(false)
      scoreHideStartTimer.current = null
    }, SCORE_DRAWER_OPEN_DELAY_MS)
    const delay = SCORE_DRAWER_OPEN_DELAY_MS + SCORE_DRAWER_TRANSITION_MS
    scoreCloseTimer.current = window.setTimeout(() => {
      setScoresMounted(false)
      setHidingScores(false)
      scoreCloseTimer.current = null
    }, delay)
  }

  if (!challenge) return null

  return (
    <div className={`display-view ${page === 'voting' ? 'display-view--voting' : ''} ${scoresMounted ? 'display-view--scores-revealed' : ''}`}>
      <header className={`display-header ${page === 'gallery' ? 'display-header--gallery' : ''}`}>
        <div className="display-brand-controls">
          <div className="brand brand--display"><b>HOUSE</b><span>PHOTO HUNT</span></div>
          <button className="display-exit-button" type="button" onClick={onExit}>Exit TV mode</button>
        </div>
        <nav className="display-tabs" aria-label="TV mode views">
          <button type="button" aria-current={page === 'tutorial' ? 'page' : undefined} onClick={() => selectPage('tutorial')}>How to play</button>
          <button type="button" aria-current={page === 'gallery' ? 'page' : undefined} onClick={() => selectPage('gallery')}>Gallery</button>
          <button type="button" aria-current={page === 'voting' ? 'page' : undefined} onClick={() => selectPage('voting')}>Voting</button>
        </nav>
        <Timer compact editable />
        {page === 'gallery' && (
          <aside className="display-gallery-join" aria-label="Scan to join the party">
            <div><span>Late to the party?</span><strong>Scan to play</strong></div>
            <QRCodeSVG value={joinUrl} size={64} bgColor="transparent" fgColor="#f5f8f7" />
          </aside>
        )}
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
          {displayedPhotos.map((photo, photoIndex) => (
            <figure key={photo.id}>
              <button
                className="display-photo-open"
                type="button"
                aria-label={`View full photo ${photoIndex + 1} for ${challenge.title}`}
                onClick={(event) => openPhotoPreview(photo.id, event.currentTarget)}
              >
                <img src={photo.photoUrl} alt={`Anonymous submission ${photoIndex + 1} for ${challenge.title}`} />
                <span>View full</span>
              </button>
              <figcaption>
                {page === 'gallery' && revealed ? <><strong>{photo.ownerName}</strong><span>{photo.voteCount} votes</span></> : <span>Photo {photoIndex + 1}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
        {!photos.length && <div className="empty-state">Photos will appear here.</div>}
        {page === 'gallery' && <div className="display-gallery-pager">Next in {pageSeconds}s <span>· ← → to move</span></div>}
      </>}

      {page === 'tutorial' && <div className="display-tutorial-page">
        <aside className="display-tutorial-summary" aria-label="Game at a glance">
          <span className="eyebrow">Game at a glance</span>
          <dl>
            <div><dt>6</dt><dd>photo challenges</dd></div>
            <div><dt>1</dt><dd>photo for each</dd></div>
            <div><dt>3 max</dt><dd>votes per round</dd></div>
          </dl>
        </aside>
        <Tutorial variant="tv" />
        <aside className="display-tutorial-join" aria-label="Join the party">
          <span className="eyebrow">Join on your phone</span>
          <QRCodeSVG value={joinUrl} size={220} bgColor="transparent" fgColor="#f5f8f7" />
          <strong>Scan to play</strong>
          <p>No app download needed.</p>
        </aside>
      </div>}

      {page === 'voting' && scoresMounted && (
        <section className={`display-score-drawer ${scoresRevealed ? 'display-score-drawer--open' : ''} ${scoresSettled ? 'display-score-drawer--settled' : ''}`} id="final-scores" aria-label="Final scores">
          <Leaderboard refreshToken={refreshToken} highlightPodium />
        </section>
      )}

      {previewPhoto && (
        <div className="photo-lightbox" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closePhotoPreview() }}>
          <section className="photo-lightbox__dialog" role="dialog" aria-modal="true" aria-labelledby="photo-lightbox-title">
            <header>
              <div>
                <span className="eyebrow">{page === 'gallery' ? 'Gallery photo' : 'Anonymous voting photo'}</span>
                <h2 id="photo-lightbox-title">Photo {previewPhotoIndex + 1}</h2>
              </div>
              <button ref={previewClose} className="button" type="button" onClick={closePhotoPreview}>Close full photo</button>
            </header>
            <div className="photo-lightbox__image">
              <img src={previewPhoto.photoUrl} alt={`Full submission ${previewPhotoIndex + 1} for ${challenge.title}`} />
            </div>
            <footer>
              <strong>{challenge.title}</strong>
              {page === 'gallery' && revealed
                ? <span>{previewPhoto.ownerName} · {previewPhoto.voteCount} votes</span>
                : <span>Photographer hidden</span>}
            </footer>
          </section>
        </div>
      )}

      <footer className={`display-footer display-footer--${page}`}>
        {page === 'gallery' ? <>
          <span>{photos.length} submissions</span>
          <button className="button button--dark" onClick={toggleResults}>{revealed ? 'Hide results' : 'Reveal results'}</button>
        </> : page === 'voting' ? <>
          <span>{photos.length} anonymous submissions</span>
          <button
            className="button button--dark display-score-toggle"
            type="button"
            aria-expanded={scoresRevealed}
            aria-controls="final-scores"
            disabled={hidingScores}
            onClick={() => scoresRevealed ? hideScores() : setConfirmingScores(true)}
          >
            {hidingScores ? 'Hiding scores…' : scoresRevealed ? 'Hide scores' : 'Reveal final scores'}
          </button>
          <span>← → to change challenge</span>
        </> : <>
          <span>House Photo Hunt</span>
          <span>Use the tabs to return to the gallery</span>
        </>}
      </footer>

      {confirmingScores && (
        <div className="name-dialog score-reveal-dialog" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmingScores(false) }}>
          <form role="dialog" aria-modal="true" aria-labelledby="score-reveal-title" onSubmit={revealScores}>
            <span className="eyebrow">Host action</span>
            <h2 id="score-reveal-title">Reveal final scores?</h2>
            <p className="dialog-warning">Are you sure you want to reveal the scores? Please only do this if you are the host.</p>
            <div>
              <button className="button" type="button" autoFocus onClick={() => setConfirmingScores(false)}>Cancel</button>
              <button className="button button--dark">Reveal scores</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
