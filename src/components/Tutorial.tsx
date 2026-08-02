interface Props {
  onBack?: () => void
  variant?: 'guest' | 'tv'
}

const steps = [
  {
    number: '01',
    title: 'Join the house',
    copy: 'Open the link or scan the TV code, enter the party passphrase from the host, then pick a unique party name. No email or app download is needed.',
    note: 'Keep this browser open: your guest identity lives on this device.',
  },
  {
    number: '02',
    title: 'Hunt for shots',
    copy: 'Work through all six challenges. Take a new picture or choose one from your camera roll for every prompt.',
    note: 'One photo per challenge. Replace it any time before it receives a vote.',
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
    copy: 'Submit one, two, or three favorites. Every choice is worth one vote, and you can change your ballot later.',
    note: 'Voting for your own masterpiece is completely allowed.',
  },
  {
    number: '05',
    title: 'Reveal the room',
    copy: 'After every challenge is voted on, reveal the final scores from the TV Voting footer and celebrate the winners.',
    note: 'First gets 3 points, second gets 2, and third gets 1. Ties share rank points.',
  },
]

const tvSteps = [
  ['01', 'Shoot every challenge', 'Work through all six prompts. Take a new photo or choose one from your camera roll for each.'],
  ['02', 'Uploaded anonymously', 'Send one anonymous entry for every challenge.'],
  ['03', 'Vote together', 'Choose up to three favorites for each challenge, then reveal the room.'],
]

export function Tutorial({ onBack, variant = 'guest' }: Props) {
  if (variant === 'tv') return (
    <section className="tv-tutorial" aria-labelledby="tv-tutorial-title">
      <header><span className="eyebrow">The one-minute briefing</span><h1 id="tv-tutorial-title">How to play</h1><p>Phones take the photos. The TV brings everyone together.</p></header>
      <div>{tvSteps.map(([number, title, copy]) => <article key={number}><b>{number}</b><h2>{title}</h2><p>{copy}</p></article>)}</div>
    </section>
  )

  return (
    <div className="tutorial-page">
      {onBack && <button className="tutorial-back" onClick={onBack}>← Back to the party</button>}
      <header className="tutorial-hero">
        <span className="eyebrow">The two-minute briefing</span>
        <h1>How to<br /><i>play.</i></h1>
        <p>Shoot freely. Vote together. Leave with highly questionable bragging rights.</p>
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
          <li><b>6</b><span>photo challenges</span></li>
          <li><b>1</b><span>entry per person per challenge</span></li>
          <li><b>3 max</b><span>equal votes per voting round</span></li>
          <li><b>3·2·1</b><span>podium points</span></li>
        </ul>
      </section>

      <section className="tutorial-tv-tip">
        <span>Big-screen tip</span>
        <p>TV <b>Gallery</b> scrolls through every submission in two newest-first rows. Switch to <b>Voting</b> and use the left and right arrow keys when the room is ready to vote challenge by challenge.</p>
      </section>
    </div>
  )
}
