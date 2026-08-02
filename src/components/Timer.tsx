import { useEffect, useRef, useState } from 'react'
import { getTimerStatus } from '../lib/timer-state'

const END_KEY = 'photo-hunt-timer-end'
const MINUTES_KEY = 'photo-hunt-timer-minutes'
const ALERT_ARMED_KEY = 'photo-hunt-timer-alert-armed'
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
  const [alertArmedFor, setAlertArmedFor] = useState(() => Number(localStorage.getItem(ALERT_ARMED_KEY)) || 0)
  const [now, setNow] = useState(Date.now())
  const audioContext = useRef<AudioContext | null>(null)
  const canPlaySound = editable || !compact

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
      setAlertArmedFor(Number(localStorage.getItem(ALERT_ARMED_KEY)) || 0)
      setNow(Date.now())
    }
    window.addEventListener(TIMER_EVENT, syncTimer)
    window.addEventListener('storage', syncTimer)
    return () => {
      window.removeEventListener(TIMER_EVENT, syncTimer)
      window.removeEventListener('storage', syncTimer)
    }
  }, [])

  useEffect(() => () => {
    void audioContext.current?.close()
  }, [])

  const { remaining, isRunning, isComplete, shouldAlert } = getTimerStatus({
    endsAt,
    now,
    idleDuration: minutes * 60_000,
    alertArmedFor,
  })

  useEffect(() => {
    if (!canPlaySound || !shouldAlert || Number(localStorage.getItem(ALERT_ARMED_KEY)) !== endsAt) return

    localStorage.removeItem(ALERT_ARMED_KEY)
    window.dispatchEvent(new Event(TIMER_EVENT))

    const context = audioContext.current
    if (!context) return
    void context.resume().then(() => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, context.currentTime)
      gain.gain.setValueAtTime(0.12, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.22)
    }).catch(() => undefined)
  }, [canPlaySound, endsAt, shouldAlert])

  function armCompletionSound() {
    if (!canPlaySound) return
    void audioContext.current?.close()
    try {
      audioContext.current = new AudioContext()
      void audioContext.current.resume().catch(() => undefined)
    } catch {
      audioContext.current = null
    }
  }

  function start() {
    const nextEnd = Date.now() + minutes * 60_000
    armCompletionSound()
    localStorage.setItem(MINUTES_KEY, String(minutes))
    localStorage.setItem(END_KEY, String(nextEnd))
    localStorage.setItem(ALERT_ARMED_KEY, String(nextEnd))
    setNow(Date.now())
    setEndsAt(nextEnd)
    setAlertArmedFor(nextEnd)
    window.dispatchEvent(new Event(TIMER_EVENT))
  }

  function reset() {
    localStorage.removeItem(END_KEY)
    localStorage.removeItem(ALERT_ARMED_KEY)
    setEndsAt(0)
    setAlertArmedFor(0)
    window.dispatchEvent(new Event(TIMER_EVENT))
  }

  const className = `timer ${compact ? 'timer--compact' : ''} ${editable ? 'timer--editable' : ''} ${isComplete ? 'timer--complete' : ''}`

  if (compact) {
    return (
      <div className={className} aria-live="polite">
        <div><span>{isRunning ? 'Photo time' : endsAt ? 'Time!' : 'Timer'}</span><strong>{formatTime(remaining)}</strong></div>
        {editable && <div className="timer__controls">
          {!isRunning && <label>Minutes<input type="number" min="1" max="240" value={minutes} onChange={(event) => setMinutes(Math.max(1, Number(event.target.value)))} /></label>}
          <button className="button button--dark" type="button" onClick={isRunning ? reset : start}>{isRunning ? 'Reset' : 'Start'}</button>
        </div>}
      </div>
    )
  }

  return (
    <section className={className} aria-label="Photo round timer">
      <div>
        <span className="eyebrow">Photo round</span>
        <strong className="timer__clock" aria-live="polite">{formatTime(remaining)}</strong>
        <span className="visually-hidden" role="status">{isComplete ? 'Time is up.' : ''}</span>
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
