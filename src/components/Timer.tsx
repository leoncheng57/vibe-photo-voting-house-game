import { useEffect, useState } from 'react'

const END_KEY = 'photo-hunt-timer-end'
const MINUTES_KEY = 'photo-hunt-timer-minutes'
const TIMER_EVENT = 'photo-hunt-timer-change'

function formatTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function Timer({ compact = false, editable = false }: { compact?: boolean; editable?: boolean }) {
  const [minutes, setMinutes] = useState(() => Number(localStorage.getItem(MINUTES_KEY)) || 90)
  const [endsAt, setEndsAt] = useState(() => Number(localStorage.getItem(END_KEY)) || 0)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!endsAt) return
    const interval = window.setInterval(() => {
      const currentTime = Date.now()
      setNow(currentTime)
      if (currentTime >= endsAt) window.clearInterval(interval)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [endsAt])

  useEffect(() => {
    function syncTimer() {
      setMinutes(Number(localStorage.getItem(MINUTES_KEY)) || 90)
      setEndsAt(Number(localStorage.getItem(END_KEY)) || 0)
      setNow(Date.now())
    }
    window.addEventListener(TIMER_EVENT, syncTimer)
    window.addEventListener('storage', syncTimer)
    return () => {
      window.removeEventListener(TIMER_EVENT, syncTimer)
      window.removeEventListener('storage', syncTimer)
    }
  }, [])

  const remaining = endsAt ? Math.max(0, endsAt - now) : minutes * 60_000
  const isRunning = endsAt > now

  function start() {
    const nextEnd = Date.now() + minutes * 60_000
    localStorage.setItem(MINUTES_KEY, String(minutes))
    localStorage.setItem(END_KEY, String(nextEnd))
    setNow(Date.now())
    setEndsAt(nextEnd)
    window.dispatchEvent(new Event(TIMER_EVENT))
  }

  function reset() {
    localStorage.removeItem(END_KEY)
    setEndsAt(0)
    window.dispatchEvent(new Event(TIMER_EVENT))
  }

  if (compact) {
    return (
      <div className={`timer timer--compact ${editable ? 'timer--editable' : ''}`} aria-live="polite">
        <div><span>{isRunning ? 'Photo time' : endsAt ? 'Time!' : 'Timer'}</span><strong>{formatTime(remaining)}</strong></div>
        {editable && <div className="timer__controls">
          {!isRunning && <label>Minutes<input type="number" min="1" max="240" value={minutes} onChange={(event) => setMinutes(Math.max(1, Number(event.target.value)))} /></label>}
          <button className="button button--dark" type="button" onClick={isRunning ? reset : start}>{isRunning ? 'Reset' : 'Start'}</button>
        </div>}
      </div>
    )
  }

  return (
    <section className="timer" aria-label="Photo round timer">
      <div>
        <span className="eyebrow">Photo round</span>
        <strong className="timer__clock" aria-live="polite">{formatTime(remaining)}</strong>
      </div>
      <div className="timer__controls">
        {!isRunning && (
          <label>
            Minutes
            <input
              type="number"
              min="1"
              max="240"
              value={minutes}
              onChange={(event) => setMinutes(Math.max(1, Number(event.target.value)))}
            />
          </label>
        )}
        <button className="button button--dark" onClick={isRunning ? reset : start}>
          {isRunning ? 'Reset' : 'Start timer'}
        </button>
      </div>
      <p>This timer stays on this device and does not lock uploads or voting.</p>
    </section>
  )
}
