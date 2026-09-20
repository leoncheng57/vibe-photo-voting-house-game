import type { Submission, WinnerMode, WinnerPick } from '../types'
import { DEFAULT_WINNER_MODE } from '../config/settings-defaults'
import { getWinningPhotoIds } from './scoring'

// Minimal shape a strategy needs. Submissions convert with toWinnerCandidates.
export interface WinnerCandidate {
  id: string
  ownerName?: string | null
  voteCount?: number | null
}

// Injected so the random draw stays pure and deterministically testable.
export type RandomSource = () => number

export interface WinnerStrategy {
  mode: WinnerMode
  // May return several picks: a voting tie has more than one first place.
  pickWinners(candidates: WinnerCandidate[], random: RandomSource): WinnerPick[]
}

export function toWinnerCandidates(submissions: Submission[]): WinnerCandidate[] {
  return submissions.map((submission) => ({
    id: submission.id,
    ownerName: submission.ownerName ?? null,
    voteCount: submission.voteCount ?? 0,
  }))
}

function toPick(candidate: WinnerCandidate, mode: WinnerMode, voteCount: number | null): WinnerPick {
  return {
    submissionId: candidate.id,
    ownerName: candidate.ownerName ?? null,
    voteCount,
    mode,
  }
}

const votingStrategy: WinnerStrategy = {
  mode: 'voting',
  pickWinners(candidates) {
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]))
    return getWinningPhotoIds(candidates.map((candidate) => ({ id: candidate.id, votes: candidate.voteCount ?? 0 })))
      .map((id) => byId.get(id))
      .filter((candidate): candidate is WinnerCandidate => Boolean(candidate))
      .map((candidate) => toPick(candidate, 'voting', candidate.voteCount ?? 0))
  },
}

const randomStrategy: WinnerStrategy = {
  mode: 'random',
  pickWinners(candidates, random) {
    if (!candidates.length) return []
    const draw = random()
    const safeDraw = Number.isFinite(draw) ? Math.min(Math.max(draw, 0), 0.999999999) : 0
    const candidate = candidates[Math.floor(safeDraw * candidates.length)]
    // Votes are not what decided this pick, so the display must not show them.
    return [toPick(candidate, 'random', null)]
  },
}

const STRATEGIES: Record<WinnerMode, WinnerStrategy> = {
  voting: votingStrategy,
  random: randomStrategy,
}

export function getWinnerStrategy(mode: WinnerMode = DEFAULT_WINNER_MODE): WinnerStrategy {
  return STRATEGIES[mode] ?? STRATEGIES[DEFAULT_WINNER_MODE]
}

export function selectWinners(
  candidates: WinnerCandidate[],
  mode: WinnerMode = DEFAULT_WINNER_MODE,
  random: RandomSource = Math.random,
): WinnerPick[] {
  return getWinnerStrategy(mode).pickWinners(candidates, random)
}

// Under 'random' a vote total says nothing about who won, so surfaces that
// present votes as a score should hide them instead of rendering zeros.
export function areVoteScoresMeaningful(mode: WinnerMode = DEFAULT_WINNER_MODE): boolean {
  return mode !== 'random'
}
