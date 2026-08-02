import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { Challenge, Submission } from '../types'
import { getSubmissions } from '../lib/api'
import { sortGallerySubmissions } from '../lib/gallery'
import { Timer } from './Timer'
import { Tutorial } from './Tutorial'
import { Leaderboard } from './Leaderboard'
import { SpotifyPlayer } from './SpotifyPlayer'
import { ChallengeIllustrations } from './ChallengeIllustrations'

const SCORE_DRAWER_TRANSITION_MS = 320
const SCORE_DRAWER_OPEN_DELAY_MS = 20
const GALLERY_SCROLL_PIXELS_PER_SECOND = 40
const GALLERY_SCROLL_EDGE_PAUSE_MS = 1800
const GALLERY_SCROLL_INTERACTION_PAUSE_MS = 5000
type DisplayPage = 'gallery' | 'voting' | 'tutorial'

export function DisplayView({ challenges, refreshToken, spotifyAuthorizationError, onExit }: { challenges: Challenge[]; refreshToken: number; spotifyAuthorizationError?: string; onExit: () => void }) {
  const [index, setIndex] = useState(0)
  const [galleryPhotos, setGalleryPhotos] = useState<Submission[]>([])
  const [votingPhotos, setVotingPhotos] = useState<Submission[]>([])
  const [error, setError] = useState('')
  const [page, setPage] = useState<DisplayPage>('gallery')
  const [prefersReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [galleryPaused, setGalleryPaused] = useState(prefersReducedMotion)
  const [previewPhotoId, setPreviewPhotoId] = useState<string | null>(null)
  const [confirmingScores, setConfirmingScores] = useState(false)
  const [scoresMounted, setScoresMounted] = useState(false)
  const [scoresRevealed, setScoresRevealed] = useState(false)
  const [scoresSettled, setScoresSettled] = useState(false)
  const [hidingScores, setHidingScores] = useState(false)
  const scoreCloseTimer = useRef<number | null>(null)
  const scoreHideStartTimer = useRef<number | null>(null)
  const scoreOpenTimer = useRef<number | null>(null)
  const scoreSettleTimer = useRef<number | null>(null)
  const previewTrigger = useRef<HTMLButtonElement | null>(null)
  const previewClose = useRef<HTMLButtonElement | null>(null)
  const restorePreviewFocus = useRef(false)
  const galleryScroll = useRef<HTMLDivElement | null>(null)
  const galleryScrollAtEnd = useRef(false)
  const galleryScrollPausedUntil = useRef(0)
  const galleryHasFocus = useRef(false)
  const challenge = challenges[index]
  const challengeById = useMemo(() => new Map(challenges.map((item) => [item.id, item])), [challenges])
  const joinUrl = useMemo(() => `${window.location.origin}${import.meta.env.BASE_URL}play/`, [])

  useEffect(() => {
    if (page !== 'gallery') return
    let current = true
    getSubmissions()
      .then((nextPhotos) => { if (current) setGalleryPhotos(sortGallerySubmissions(nextPhotos)) })
      .catch((reason: Error) => { if (current) setError(reason.message) })
    return () => { current = false }
  }, [page, refreshToken])

  useEffect(() => {
    if (!challenge || page !== 'voting') return
    let current = true
    getSubmissions(challenge.id)
      .then((nextPhotos) => { if (current) setVotingPhotos(nextPhotos) })
      .catch((reason: Error) => { if (current) setError(reason.message) })
    return () => { current = false }
  }, [challenge, page, refreshToken])

  useEffect(() => {
    const element = galleryScroll.current
    if (page !== 'gallery' || previewPhotoId || galleryPaused || !element || prefersReducedMotion) return
    const scrollElement = element

    let previousTime = Date.now()
    const interval = window.setInterval(() => {
      const currentTime = Date.now()
      const elapsed = Math.min(1000, currentTime - previousTime)
      previousTime = currentTime
      const maxScroll = scrollElement.scrollWidth - scrollElement.clientWidth

      if (!galleryHasFocus.current && Date.now() >= galleryScrollPausedUntil.current && maxScroll > 0) {
        if (galleryScrollAtEnd.current) {
          scrollElement.scrollLeft = 0
          galleryScrollAtEnd.current = false
          galleryScrollPausedUntil.current = Date.now() + GALLERY_SCROLL_EDGE_PAUSE_MS
        } else {
          scrollElement.scrollLeft += GALLERY_SCROLL_PIXELS_PER_SECOND * elapsed / 1000
        }
        if (scrollElement.scrollLeft >= maxScroll - 1) {
          scrollElement.scrollLeft = maxScroll
          galleryScrollAtEnd.current = true
          galleryScrollPausedUntil.current = Date.now() + GALLERY_SCROLL_EDGE_PAUSE_MS
        }
      }
    }, 50)
    return () => window.clearInterval(interval)
  }, [galleryPaused, galleryPhotos.length, page, prefersReducedMotion, previewPhotoId])

  useEffect(() => {
    const element = galleryScroll.current
    if (!element || page !== 'gallery') return
    element.scrollLeft = 0
    galleryScrollAtEnd.current = false
    galleryScrollPausedUntil.current = Date.now() + GALLERY_SCROLL_EDGE_PAUSE_MS
  }, [galleryPhotos.length, page])

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
      if (!delta || previewPhotoId || !challenges.length || page !== 'voting') return
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

  const displayedPhotos = page === 'gallery' ? galleryPhotos : votingPhotos
  const previewPhoto = previewPhotoId ? displayedPhotos.find((photo) => photo.id === previewPhotoId) : undefined
  const previewPhotoIndex = previewPhotoId ? displayedPhotos.findIndex((photo) => photo.id === previewPhotoId) : -1
  const previewChallenge = previewPhoto ? challengeById.get(previewPhoto.challenge_id) : undefined
  const voteTarget = Math.min(3, votingPhotos.length)

  function move(delta: number) {
    if (!challenges.length) return
    setIndex((current) => (current + delta + challenges.length) % challenges.length)
  }

  function pauseGalleryScroll() {
    galleryScrollPausedUntil.current = Date.now() + GALLERY_SCROLL_INTERACTION_PAUSE_MS
  }

  function toggleGalleryMotion() {
    setGalleryPaused((current) => {
      if (current) galleryScrollPausedUntil.current = 0
      return !current
    })
  }

  function selectPage(nextPage: DisplayPage) {
    restorePreviewFocus.current = false
    setPreviewPhotoId(null)
    previewTrigger.current = null
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
    pauseGalleryScroll()
    restorePreviewFocus.current = false
    previewTrigger.current = trigger
    setPreviewPhotoId(photoId)
  }

  function closePhotoPreview() {
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
    <div className={`display-view ${page === 'gallery' ? 'display-view--gallery' : ''} ${page === 'voting' ? 'display-view--voting' : ''} ${scoresMounted ? 'display-view--scores-revealed' : ''}`}>
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

      {page === 'gallery' && (
        <section className="display-gallery-page" aria-label="Live party gallery">
          <header className="display-gallery-intro">
            <div><span className="eyebrow">Newest first · live from the house</span><h1>Every shot. One gallery.</h1></div>
            <div className="display-gallery-motion">
              <p>{galleryPhotos.length} photos across {challenges.length} challenges. Two rows move continuously to the right.</p>
              <button
                className="button button--dark display-gallery-motion__toggle"
                type="button"
                aria-label={prefersReducedMotion ? 'Carousel motion disabled' : galleryPaused ? 'Play carousel' : 'Pause carousel'}
                title={prefersReducedMotion ? 'Carousel motion disabled' : galleryPaused ? 'Play carousel' : 'Pause carousel'}
                aria-pressed={galleryPaused}
                disabled={prefersReducedMotion}
                onClick={toggleGalleryMotion}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {galleryPaused
                    ? <path d="M8 5v14l11-7z" />
                    : <><path d="M6 5h4v14H6z" /><path d="M14 5h4v14h-4z" /></>}
                </svg>
              </button>
            </div>
          </header>
          {error && <div className="notice notice--error">{error}</div>}
          {galleryPhotos.length ? <div
            className="display-gallery-scroll"
            ref={galleryScroll}
            onWheel={pauseGalleryScroll}
            onTouchStart={pauseGalleryScroll}
            onPointerDown={pauseGalleryScroll}
            onFocusCapture={() => { galleryHasFocus.current = true }}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                galleryHasFocus.current = false
                pauseGalleryScroll()
              }
            }}
          >
            <div className="photo-grid photo-grid--display photo-grid--gallery">
              {galleryPhotos.map((photo, photoIndex) => {
                const photoChallenge = challengeById.get(photo.challenge_id)
                const challengeIndex = Math.max(0, challenges.findIndex((item) => item.id === photo.challenge_id))
                return <figure className={`gallery-card--${(challengeIndex % 3) + 1}`} key={photo.id}>
                  <button
                    className="display-photo-open"
                    type="button"
                    aria-label={`View full photo for ${photoChallenge?.title ?? 'challenge'}`}
                    onClick={(event) => openPhotoPreview(photo.id, event.currentTarget)}
                  >
                    <img src={photo.photoUrl} alt={`Anonymous submission for ${photoChallenge?.title ?? 'a party challenge'}`} />
                    <span>View full</span>
                  </button>
                  <figcaption>
                    <strong>{photoChallenge?.title ?? 'Party challenge'}</strong>
                    <span>Challenge {String(challengeIndex + 1).padStart(2, '0')} · Photo {String(photoIndex + 1).padStart(2, '0')}</span>
                  </figcaption>
                </figure>
              })}
            </div>
          </div> : <div className="empty-state">Photos will appear here.</div>}
        </section>
      )}

      {page === 'voting' && <>
        <section className="display-title">
          <button type="button" aria-label="Previous challenge" onClick={() => move(-1)}>←</button>
          <div>
            <span className="eyebrow">Challenge {String(index + 1).padStart(2, '0')} / {String(challenges.length).padStart(2, '0')}</span>
            <h2>{challenge.title}</h2>
            <p>{challenge.prompt}</p>
          </div>
          <button type="button" aria-label="Next challenge" onClick={() => move(1)}>→</button>
        </section>

        <section className="display-voting-callout"><span>Voting is open</span><h1>Choose on your phone.</h1><p>{voteTarget ? <>Open <b>Vote</b> and select {voteTarget} {voteTarget === 1 ? 'favorite' : 'favorites'} for this challenge.</> : 'Photos will appear here as guests submit them.'}</p></section>
        {error && <div className="notice notice--error">{error}</div>}
        <div className="photo-grid photo-grid--display">
          {votingPhotos.map((photo, photoIndex) => (
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
              <figcaption><span>Photo {photoIndex + 1}</span></figcaption>
            </figure>
          ))}
        </div>
        {!votingPhotos.length && <div className="empty-state">Photos will appear here.</div>}
      </>}

      {page === 'tutorial' && <div className="display-tutorial-page">
        <Tutorial variant="tv" />
        <ChallengeIllustrations challenges={challenges} />
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
              <img src={previewPhoto.photoUrl} alt={`Full submission ${previewPhotoIndex + 1} for ${previewChallenge?.title ?? 'a party challenge'}`} />
            </div>
            <footer>
              <strong>{previewChallenge?.title ?? 'Party challenge'}</strong>
              <span>Photographer hidden</span>
            </footer>
          </section>
        </div>
      )}

      <footer className={`display-footer display-footer--${page}`}>
        {page === 'gallery' ? <>
          <span>{galleryPhotos.length} photos</span>
          <strong>Live gallery</strong>
          <span>{prefersReducedMotion ? 'Reduced motion · manual scroll' : galleryPaused ? 'Carousel paused' : 'Newest first · moving right'}</span>
        </> : page === 'voting' ? <>
          <span>{votingPhotos.length} anonymous submissions</span>
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

      <SpotifyPlayer authorizationError={spotifyAuthorizationError} />

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
