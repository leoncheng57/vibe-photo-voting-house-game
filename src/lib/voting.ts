import type { WinnerMode } from '../types'
import { DEFAULT_WINNER_MODE } from '../config/settings-defaults'
import { areVoteScoresMeaningful } from './winner'

export function getVoteLimit(submissionCount: number) {
  return Math.min(3, Math.max(0, submissionCount))
}

export function canSubmitVotes(selectedCount: number, submissionCount: number) {
  const limit = getVoteLimit(submissionCount)
  return submissionCount > 0 && selectedCount >= 0 && selectedCount <= limit
}

// Under 'random' nothing a ballot says can change the result, so the vote
// screen and every link to it are hidden rather than left open as decoration.
export function isVotingOpen(winnerMode: WinnerMode = DEFAULT_WINNER_MODE) {
  return areVoteScoresMeaningful(winnerMode)
}

export function getBallotSummary(winnerMode: WinnerMode = DEFAULT_WINNER_MODE) {
  return areVoteScoresMeaningful(winnerMode)
    ? 'Submit up to three favorites. Every choice is worth one vote, your own photo is fair game, and confirming zero votes clears your ballot.'
    : 'Winners are drawn at random this party, so votes are for bragging rights only. Submit up to three favorites, your own photo is fair game, and confirming zero votes clears your ballot.'
}
