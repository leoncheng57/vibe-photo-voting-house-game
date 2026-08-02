import { describe, expect, it } from 'vitest'
import { getTimerStatus } from './timer-state'

const runningTimer = {
  endsAt: 10_000,
  now: 9_000,
  idleDuration: 60_000,
  alertArmedFor: 10_000,
}

describe('getTimerStatus', () => {
  it('completes and requests one alert when an armed timer reaches zero', () => {
    expect(getTimerStatus({ ...runningTimer, now: 10_000 })).toEqual({
      remaining: 0,
      isRunning: false,
      isComplete: true,
      shouldAlert: true,
    })
  })

  it('does not request another alert after the completion is consumed', () => {
    expect(getTimerStatus({ ...runningTimer, now: 10_000, alertArmedFor: 0 }).shouldAlert).toBe(false)
  })

  it('does not alert when an already-expired timer is loaded without an armed run', () => {
    const status = getTimerStatus({ ...runningTimer, now: 20_000, alertArmedFor: 0 })

    expect(status.isComplete).toBe(true)
    expect(status.shouldAlert).toBe(false)
  })

  it('only alerts for the currently armed timer run', () => {
    const status = getTimerStatus({ ...runningTimer, now: 10_000, alertArmedFor: 20_000 })

    expect(status.shouldAlert).toBe(false)
  })

  it('returns to the configured duration after reset', () => {
    expect(getTimerStatus({ ...runningTimer, endsAt: 0, alertArmedFor: 0 })).toEqual({
      remaining: 60_000,
      isRunning: false,
      isComplete: false,
      shouldAlert: false,
    })
  })
})
