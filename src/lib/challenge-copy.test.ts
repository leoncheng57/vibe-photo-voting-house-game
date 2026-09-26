import { describe, expect, it } from 'vitest'
import { challengeListHeading, countWord } from './challenge-copy'
import { isVotingOpen } from './voting'
import { APPS } from '../config/apps'

describe('countWord', () => {
  it('spells out small counts and falls back to digits', () => {
    expect(countWord(3)).toBe('Three')
    expect(countWord(6)).toBe('Six')
    expect(countWord(40)).toBe('40')
  })
})

describe('challengeListHeading', () => {
  it('follows the loaded challenge count', () => {
    expect(challengeListHeading(3)).toBe('Three shots.')
    expect(challengeListHeading(6)).toBe('Six shots.')
    expect(challengeListHeading(1)).toBe('One shot.')
  })

  it('never claims a count before challenges load', () => {
    expect(challengeListHeading(0)).toBe('The shots.')
  })
})

describe('per-app voting', () => {
  it('opens voting only where a ballot decides the winner', () => {
    expect(isVotingOpen('voting')).toBe(true)
    expect(isVotingOpen('random')).toBe(false)
  })

  it('starts the birthday hunt on a random draw and the house game on votes', () => {
    expect(isVotingOpen(APPS['house-party'].defaultWinnerMode)).toBe(true)
    expect(isVotingOpen(APPS['bday-hunt'].defaultWinnerMode)).toBe(false)
  })
})
