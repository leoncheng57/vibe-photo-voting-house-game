export function getVoteLimit(submissionCount: number) {
  return Math.min(3, Math.max(0, submissionCount))
}

export function canSubmitVotes(selectedCount: number, submissionCount: number) {
  const limit = getVoteLimit(submissionCount)
  return submissionCount > 0 && selectedCount >= 0 && selectedCount <= limit
}
