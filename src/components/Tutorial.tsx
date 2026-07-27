interface Props {
  onBack?: () => void
}

const steps = [
  {
    number: '01',
    title: 'Join the house',
    copy: 'Open the link or scan the TV code. Pick a unique party name. No email, password, or app download is needed.',
    note: 'Keep this browser open: your guest identity lives on this device.',
  },
  {
    number: '02',
    title: 'Hunt for shots',
    copy: 'Browse all six challenges and join any you like. Take a new picture or choose one from your camera roll.',
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
    copy: 'Choose every available photo until there are three, then select your three favorites. Every choice is worth one vote.',
    note: 'Voting for your own masterpiece is completely allowed.',
  },
  {
    number: '05',
    title: 'Reveal the room',
    copy: 'Reveal the results on TV, celebrate the photographers, then advance to the next challenge.',
    note: 'First gets 3 points, second gets 2, and third gets 1. Ties share rank points.',
  },
]

export function Tutorial({ onBack }: Props) {
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
        <p>Open <b>TV mode</b>, use the left and right arrow keys to switch challenges, and press <b>Reveal results</b> after everyone confirms their ballot.</p>
      </section>
    </div>
  )
}
