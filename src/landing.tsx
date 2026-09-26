import { StrictMode, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'
import { APPS, APP_IDS } from './config/apps'
import { getAppBaseUrl } from './lib/active-app'
import { themeDeclarations } from './lib/apply-theme'
import { SURFACE_THEMES } from './config/settings-defaults'
import './landing.css'

const appRoot = import.meta.env.BASE_URL

// The front page itself is grey; each game's card previews that game's own
// palette by redefining the tokens on the card.
function appCardStyle(appId: keyof typeof SURFACE_THEMES): CSSProperties {
  return Object.fromEntries(themeDeclarations(SURFACE_THEMES[appId]).map(({ property, value }) => [property, value])) as CSSProperties
}

export function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href={appRoot}><b>PHOTO</b><span>HUNT</span></a>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <span className="landing-kicker">Two parties, one photo hunt</span>
            <h1>Find it.<br />Frame it.<br /><i>Fight for it.</i></h1>
            <p>Photo challenges, anonymous voting, and a big-screen reveal. Pick the party you are running — the game is the same, the setting is not.</p>
            <div className="landing-actions">
              <a className="landing-button landing-button--primary" href="#games">Pick a game <span>↓</span></a>
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

        <section className="landing-apps" id="games" aria-labelledby="landing-apps-title">
          <header>
            <span>Choose your party / 02 games</span>
            <h2 id="landing-apps-title">Indoors or outdoors.</h2>
          </header>
          <div>
            {APP_IDS.map((appId) => {
              const app = APPS[appId]
              const playUrl = getAppBaseUrl(appId, appRoot)
              return (
                <article className={`landing-app landing-app--${app.slug}`} key={app.id} style={appCardStyle(appId)}>
                  <span className="landing-app__kicker">{app.kicker}</span>
                  <h3>{app.name}</h3>
                  <p className="landing-app__tagline">{app.tagline}</p>
                  <p>{app.description}</p>
                  <div className="landing-app__actions">
                    <a className="landing-button landing-button--primary" href={playUrl}>Play <span>→</span></a>
                    <a className="landing-button" href={`${playUrl}?tutorial`}>How to play</a>
                  </div>
                </article>
              )
            })}
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
          <a href="#games">Pick a game →</a>
        </section>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><LandingPage /></StrictMode>)
