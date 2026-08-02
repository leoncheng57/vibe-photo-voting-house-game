import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './landing.css'

const appRoot = import.meta.env.BASE_URL
const playUrl = `${appRoot}play/`

export function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href={appRoot}><b>HOUSE</b><span>PHOTO HUNT</span></a>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <span className="landing-kicker">A camera-roll house party</span>
            <h1>Find it.<br />Frame it.<br /><i>Fight for it.</i></h1>
            <p>Six photo challenges. One shared room. Three votes each. Turn every guest into a photographer and the biggest screen in the house into the reveal.</p>
            <div className="landing-actions">
              <a className="landing-button landing-button--primary" href={playUrl}>Play now <span>→</span></a>
              <a className="landing-button" href={`${playUrl}?tutorial`}>How to play</a>
            </div>
            <a className="landing-developer-link" href={`${appRoot}developer/github-progress/`}>Explore the developer workspace →</a>
          </div>
          <div className="landing-poster" aria-label="Photo hunt game preview">
            <span className="landing-poster__number">06</span>
            <div className="landing-polaroid landing-polaroid--one"><span>THE BEST SEAT</span></div>
            <div className="landing-polaroid landing-polaroid--two"><span>TINY TREASURE</span></div>
            <strong>SHOOT<br />TO WIN</strong>
          </div>
        </section>

        <section className="landing-steps" aria-labelledby="landing-steps-title">
          <header>
            <span>Party flow / 03 moves</span>
            <h2 id="landing-steps-title">Shoot. Vote. Glory.</h2>
          </header>
          <div>
            <article><b>01</b><h3>Hunt</h3><p>Pick a prompt and capture your answer before photo time runs out.</p></article>
            <article><b>02</b><h3>Vote</h3><p>Photos stay anonymous while everyone chooses up to three favorites.</p></article>
            <article><b>03</b><h3>Reveal</h3><p>Put TV mode on the big screen, expose the artists, and crown the room.</p></article>
          </div>
        </section>

        <section className="landing-tv">
          <div><span>Built for phones</span><strong>Take the party with you.</strong></div>
          <div><span>Built for the TV</span><strong>Bring everyone back together.</strong></div>
          <a href={playUrl}>Enter House Photo Hunt →</a>
        </section>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><LandingPage /></StrictMode>)
