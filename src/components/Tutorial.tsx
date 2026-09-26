import type { WinnerMode } from '../types'
import { DEFAULT_WINNER_MODE } from '../config/settings-defaults'
import { isVotingOpen } from '../lib/voting'
import { APPS } from '../config/apps'
import { getActiveAppId } from '../lib/active-app'

const activeApp = APPS[getActiveAppId()]

interface Props {
  onBack?: () => void
  variant?: 'guest' | 'tv'
  winnerMode?: WinnerMode
}

const votingSteps = [
  {
    number: '01',
    title: `Join ${activeApp.copy.place}`,
    copy: 'Open the link or scan the TV code, enter the party passphrase from the host, then pick a unique party name. No email or app download is needed.',
    note: 'Keep this browser open: your guest identity lives on this device.',
  },
  {
    number: '02',
    title: 'Hunt for shots',
    copy: 'Work through every challenge. Take a new picture or choose one from your camera roll for every prompt.',
    note: 'One photo per challenge. A voted photo can be replaced after a warning, but replacement clears all of its votes.',
  },
  {
    number: '03',
    title: 'Gather to vote',
    copy: 'When photo time ends, put TV mode on the big screen and move through one challenge at a time.',
    note: 'Photographer names stay hidden on the voting screen.',
  },
  {
    number: '04',
    title: 'Choose up to three',
    copy: 'Submit up to three favorites. Every choice is worth one vote, and you can change your ballot or clear every vote later.',
    note: 'Voting for your own masterpiece is completely allowed. Confirm zero votes to clear a saved ballot.',
  },
  {
    number: '05',
    title: 'Reveal the room',
    copy: 'Reveal each challenge winner from TV Voting, then reveal the final leaderboard after every challenge is complete.',
    note: 'Every vote received counts. The guest with the most total votes wins, and tied totals share a rank.',
  },
]

// Random-draw parties share the first two steps; nothing after them involves a ballot.
const randomSteps = [
  ...votingSteps.slice(0, 2).map((step) => step.number === '02'
    ? { ...step, note: 'One photo per challenge. You can replace it any time before the draw.' }
    : step),
  {
    number: '03',
    title: 'Gather for the draw',
    copy: 'When photo time ends, put TV mode on the big screen and move through one challenge at a time.',
    note: 'There is no voting. Every entry has the same chance.',
  },
  {
    number: '04',
    title: 'Reveal the winners',
    copy: 'The TV draws one entry at random for each challenge and reveals whose photo it is.',
    note: 'The leaderboard counts challenge wins.',
  },
]

const tvSteps = [
  ['01', 'Shoot every challenge', 'Work through every prompt. Take a new photo or choose one from your camera roll for each.'],
  ['02', 'Uploaded anonymously', 'Send one anonymous entry for every challenge.'],
]

export function Tutorial({ onBack, variant = 'guest', winnerMode = DEFAULT_WINNER_MODE }: Props) {
  const votingOpen = isVotingOpen(winnerMode)
  const steps = votingOpen ? votingSteps : randomSteps
  const tvStepsForMode = [...tvSteps, votingOpen
    ? ['03', 'Vote together', 'Choose up to three favorites for each challenge, then reveal the room.']
    : ['03', 'Draw together', 'One entry per challenge is drawn at random on the big screen.']]
  if (variant === 'tv') return (
    <section className="tv-tutorial" aria-labelledby="tv-tutorial-title">
      <header><span className="eyebrow">The one-minute briefing</span><h1 id="tv-tutorial-title">How to play</h1><p>Phones take the photos. The TV brings everyone together.</p></header>
      <div>{tvStepsForMode.map(([number, title, copy]) => <article key={number}><b>{number}</b><h2>{title}</h2><p>{copy}</p></article>)}</div>
    </section>
  )

  return (
    <div className="tutorial-page">
      {onBack && <button className="tutorial-back" onClick={onBack}>← Back to the party</button>}
      <header className="tutorial-hero">
        <span className="eyebrow">The two-minute briefing</span>
        <h1>How to<br /><i>play.</i></h1>
        <p>{votingOpen ? 'Shoot freely. Vote together.' : 'Shoot freely. Let the draw decide.'} Leave with highly questionable bragging rights.</p>
      </header>

      <div className="tutorial-steps">
        {steps.map((step, index) => (
          <article key={step.number} className={`tutorial-step tutorial-step--${(index % 4) + 1}`}>
            <span>{step.number}</span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.copy}</p>
              <small>{step.note}</small>
            </div>
          </article>
        ))}
      </div>

      <section className="tutorial-rules">
        <div>
          <span className="eyebrow">Quick rules</span>
          <h2>The fine print,<br />but actually fun.</h2>
        </div>
        <ul>
          <li><b>1</b><span>entry per person per challenge</span></li>
          {votingOpen ? <>
            <li><b>3 max</b><span>equal votes per voting round</span></li>
            <li><b>Most</b><span>total votes wins</span></li>
          </> : <>
            <li><b>1</b><span>random winner per challenge</span></li>
            <li><b>0</b><span>votes to cast</span></li>
          </>}
        </ul>
      </section>

      <section className="tutorial-tv-tip">
        <span>Big-screen tip</span>
        <p>TV <b>Gallery</b> scrolls through every submission in two newest-first rows. Switch to <b>{votingOpen ? 'Voting' : 'Draw'}</b> and use the left and right arrow keys when the room is ready to {votingOpen ? 'vote' : 'draw'} challenge by challenge.</p>
      </section>
    </div>
  )
}
