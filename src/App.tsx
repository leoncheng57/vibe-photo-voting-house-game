import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { ChallengeList } from './components/ChallengeList'
import { DisplayView } from './components/DisplayView'
import { Leaderboard } from './components/Leaderboard'
import { Palette } from './components/Palette'
import { SystemDiagram } from './components/SystemDiagram'
import { Timer } from './components/Timer'
import { Tutorial } from './components/Tutorial'
import { VoteView } from './components/VoteView'
import { createProfile, ensureAnonymousUser, getChallenges, getProfile } from './lib/api'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { Challenge, Profile, View } from './types'

const navItems: Array<{ id: View; label: string }> = [
  { id: 'challenges', label: 'Challenges' },
  { id: 'tutorial', label: 'How to play' },
  { id: 'palette', label: 'Palette' },
  { id: 'system', label: 'System' },
  { id: 'vote', label: 'Vote' },
  { id: 'leaderboard', label: 'Scores' },
  { id: 'display', label: 'TV mode' },
]

function SetupRequired({ onTutorial, onPalette, onSystem }: { onTutorial: () => void; onPalette: () => void; onSystem: () => void }) {
  return (
    <main className="setup-page">
      <div className="brand"><b>HOUSE</b><span>PHOTO HUNT</span></div>
      <section>
        <span className="eyebrow">One last setup step</span>
        <h1>Connect the<br />party backend.</h1>
        <p>Create a free Supabase project, run <code>supabase/migrations/001_initial.sql</code>, and add its public values to a local <code>.env</code> file.</p>
        <pre>VITE_SUPABASE_URL=https://your-project.supabase.co{`\n`}VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...</pre>
        <div className="setup-page__actions">
          <button className="button button--dark" onClick={onTutorial}>Preview how to play →</button>
          <button className="button" onClick={onPalette}>View color palette →</button>
          <button className="button" onClick={onSystem}>View system diagram →</button>
        </div>
        <p className="setup-page__note">Full setup and GitHub Pages instructions are in <code>README.md</code>.</p>
      </section>
    </main>
  )
}

function JoinForm({ user, onJoined, onTutorial }: { user: User; onJoined: (profile: Profile) => void; onTutorial: () => void }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (name.trim().length < 2) return
    setBusy(true)
    setError('')
    try {
      onJoined(await createProfile(user.id, name))
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Could not join.'
      setError(message.includes('profiles_display_name_unique') ? 'That name is already taken.' : message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="join-page">
      <div className="join-page__stripe">HOUSEWARMING · ONE NIGHT ONLY · HOUSEWARMING · ONE NIGHT ONLY</div>
      <section className="join-card">
        <div className="brand"><b>HOUSE</b><span>PHOTO HUNT</span></div>
        <span className="join-card__number">08</span>
        <div className="join-card__copy">
          <span className="eyebrow">A camera roll competition</span>
          <h1>Shoot.<br />Vote.<br /><i>Glory.</i></h1>
          <p>Eight photo challenges. Three votes each. One house champion.</p>
        </div>
        <form onSubmit={submit}>
          <label htmlFor="name">What should we call you?</label>
          <div>
            <input id="name" maxLength={24} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your party name" autoFocus />
            <button className="button button--dark" disabled={busy || name.trim().length < 2}>{busy ? 'Joining…' : 'Enter the house →'}</button>
          </div>
          <button className="join-card__tutorial" type="button" onClick={onTutorial}>New here? See how to play →</button>
          {error && <p className="form-error">{error}</p>}
        </form>
      </section>
    </main>
  )
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [view, setView] = useState<View>(() => {
    const params = new URLSearchParams(location.search)
    if (params.has('display')) return 'display'
    if (params.has('tutorial')) return 'tutorial'
    if (params.has('palette')) return 'palette'
    if (params.has('system')) return 'system'
    return 'challenges'
  })
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState('')
  const [submissionToken, setSubmissionToken] = useState(0)
  const [resultsToken, setResultsToken] = useState(0)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    ensureAnonymousUser()
      .then(async (currentUser) => {
        setUser(currentUser)
        const [currentProfile, availableChallenges] = await Promise.all([
          getProfile(currentUser.id),
          getChallenges(),
        ])
        setProfile(currentProfile)
        setChallenges(availableChallenges)
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!supabase || !profile) return
    const realtime = supabase
    const channel = realtime
      .channel('party-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
        setSubmissionToken((value) => value + 1)
        setResultsToken((value) => value + 1)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => setResultsToken((value) => value + 1))
      .subscribe()
    return () => { void realtime.removeChannel(channel) }
  }, [profile])

  useEffect(() => {
    if (view !== 'display') return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setView('challenges')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  if (!isSupabaseConfigured && view === 'tutorial') return <main className="public-tutorial"><Tutorial onBack={() => setView('challenges')} /></main>
  if (!isSupabaseConfigured && view === 'palette') return <main className="public-palette"><Palette onBack={() => setView('challenges')} /></main>
  if (!isSupabaseConfigured && view === 'system') return <main className="public-system"><SystemDiagram onBack={() => setView('challenges')} /></main>
  if (!isSupabaseConfigured) return <SetupRequired onTutorial={() => setView('tutorial')} onPalette={() => setView('palette')} onSystem={() => setView('system')} />
  if (loading) return <div className="loading-screen"><div className="brand"><b>HOUSE</b><span>PHOTO HUNT</span></div><span>Opening the door…</span></div>
  if (error) return <main className="error-page"><h1>Couldn’t open the party.</h1><p>{error}</p><button className="button" onClick={() => location.reload()}>Try again</button></main>
  if (user && !profile && view === 'tutorial') return <main className="public-tutorial"><Tutorial onBack={() => setView('challenges')} /></main>
  if (user && !profile && view === 'palette') return <main className="public-palette"><Palette onBack={() => setView('challenges')} /></main>
  if (user && !profile && view === 'system') return <main className="public-system"><SystemDiagram onBack={() => setView('challenges')} /></main>
  if (user && !profile) return <JoinForm user={user} onJoined={setProfile} onTutorial={() => setView('tutorial')} />
  if (!user || !profile) return null

  if (view === 'display') {
    return <DisplayView challenges={challenges} refreshToken={resultsToken} onExit={() => setView('challenges')} />
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand brand--button" onClick={() => setView('challenges')}><b>HOUSE</b><span>PHOTO HUNT</span></button>
        <nav>
          {navItems.map((item) => (
            <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>{item.label}</button>
          ))}
        </nav>
        <div className="player-chip"><span>Playing as</span><strong>{profile.display_name}</strong></div>
      </header>

      <div className="mobile-timer"><Timer compact /></div>
      <main className="content">
        {view === 'challenges' && <><Timer /><ChallengeList challenges={challenges} userId={user.id} refreshToken={submissionToken} onChanged={() => { setSubmissionToken((value) => value + 1); setResultsToken((value) => value + 1) }} /></>}
        {view === 'tutorial' && <Tutorial />}
        {view === 'palette' && <Palette />}
        {view === 'system' && <SystemDiagram />}
        {view === 'vote' && <VoteView challenges={challenges} userId={user.id} refreshToken={submissionToken} onChanged={() => setResultsToken((value) => value + 1)} />}
        {view === 'leaderboard' && <Leaderboard refreshToken={resultsToken} />}
      </main>

      <nav className="mobile-nav">
        {navItems.map((item) => (
          <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>{item.label}</button>
        ))}
      </nav>
    </div>
  )
}
