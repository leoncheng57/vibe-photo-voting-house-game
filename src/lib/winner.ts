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

// A random draw has to give the same answer on every render, every reload and
// every screen, or the TV reveals one winner and a revisit shows another. The
// seed is the challenge plus its exact set of entries, so the pick only changes
// when an entry is added, replaced or removed.
export function getRandomDrawSeed(challengeId: number, candidateIds: string[]): string {
  return `${challengeId}:${[...candidateIds].sort().join(',')}`
}

// FNV-1a into mulberry32: tiny, dependency-free, and uniform enough to pick
// one photo out of a party's worth.
export function seededRandom(seed: string): RandomSource {
  let state = 0x811c9dc5
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index)
    state = Math.imul(state, 0x01000193)
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

// Sorted first: the draw is an index, and the TV and the leaderboard receive the
// same entries in different orders.
export function drawRandomWinners(challengeId: number, candidates: WinnerCandidate[]): WinnerPick[] {
  const ordered = [...candidates].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
  const seed = getRandomDrawSeed(challengeId, ordered.map((candidate) => candidate.id))
  return selectWinners(ordered, 'random', seededRandom(seed))
}

export interface DrawEntry {
  id: string
  challenge_id: number
  user_id: string
}

// Random wins are never stored, so the leaderboard replays the same draw the
// TV shows for every challenge and counts the results per guest.
export function countRandomDrawWins(entries: DrawEntry[]): Map<string, number> {
  const byChallenge = new Map<number, DrawEntry[]>()
  for (const entry of entries) {
    byChallenge.set(entry.challenge_id, [...(byChallenge.get(entry.challenge_id) ?? []), entry])
  }
  const wins = new Map<string, number>()
  for (const [challengeId, challengeEntries] of byChallenge) {
    const ownerById = new Map(challengeEntries.map((entry) => [entry.id, entry.user_id]))
    for (const pick of drawRandomWinners(challengeId, challengeEntries.map((entry) => ({ id: entry.id })))) {
      const owner = ownerById.get(pick.submissionId)
      if (owner) wins.set(owner, (wins.get(owner) ?? 0) + 1)
    }
  }
  return wins
}

// One overall winner drawn from every entry across every challenge. Each photo
// is one ticket, so a guest who entered every challenge has that many chances.
// Seeded like the per-challenge draw, on the whole entry set, so it holds still
// across reloads and screens until an entry changes.
export function getGrandDrawSeed(candidateIds: string[]): string {
  return `grand:${[...candidateIds].sort().join(',')}`
}

export function drawGrandWinner(candidates: WinnerCandidate[]): WinnerPick[] {
  const ordered = [...candidates].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
  return selectWinners(ordered, 'random', seededRandom(getGrandDrawSeed(ordered.map((candidate) => candidate.id))))
}
