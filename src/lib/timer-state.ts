export interface TimerSnapshot {
  endsAt: number
  now: number
  idleDuration: number
  alertArmedFor: number
}

export function getTimerStatus({ endsAt, now, idleDuration, alertArmedFor }: TimerSnapshot) {
  const isRunning = endsAt > now
  const isComplete = endsAt > 0 && !isRunning

  return {
    remaining: endsAt ? Math.max(0, endsAt - now) : idleDuration,
    isRunning,
    isComplete,
    shouldAlert: isComplete && alertArmedFor === endsAt,
  }
}
