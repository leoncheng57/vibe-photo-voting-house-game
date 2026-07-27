import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { ChallengeList } from './components/ChallengeList'
import { DisplayView } from './components/DisplayView'
import { Leaderboard } from './components/Leaderboard'
import { Palette } from './components/Palette'
import { MobileNavigation, SiteHeader } from './components/SiteNavigation'
import { Timer } from './components/Timer'
import { Tutorial } from './components/Tutorial'
import { VoteView } from './components/VoteView'
import { createProfile, ensureAnonymousUser, getChallenges, getProfile, updateProfile } from './lib/api'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { Challenge, Profile, View } from './types'

const appRoot = import.meta.env.BASE_URL
const homeUrl = `${appRoot}home/`
const isHomeEntry = location.pathname.startsWith(homeUrl)

function SetupRequired({ onTutorial, onPalette }: { onTutorial: () => void; onPalette: () => void }) {
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
        </div>
        <p className="setup-page__note">Full setup and GitHub Pages instructions are in <code>README.md</code>.</p>
      </section>
    </main>
  )
}

function JoinForm({ user, profile, onJoined, onTutorial }: { user: User; profile?: Profile; onJoined: (profile: Profile) => void; onTutorial: () => void }) {
  const [name, setName] = useState(profile?.display_name ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (name.trim().length < 2) return
    setBusy(true)
    setError('')
    try {
      onJoined(profile ? await updateProfile(user.id, name) : await createProfile(user.id, name))
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
        <span className="join-card__number">06</span>
        <div className="join-card__copy">
          <span className="eyebrow">A camera roll competition</span>
          <h1>Shoot.<br />Vote.<br /><i>Glory.</i></h1>
          <p>Six photo challenges. Up to three votes each. One house champion.</p>
        </div>
        <form onSubmit={submit}>
          <label htmlFor="name">What should we call you?</label>
          <div>
            <input id="name" maxLength={24} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoFocus />
            <button className="button button--dark" disabled={busy || name.trim().length < 2}>{busy ? 'Saving…' : profile ? 'Save & enter →' : 'Enter the house →'}</button>
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
    if (params.has('vote')) return 'vote'
    if (params.has('leaderboard')) return 'leaderboard'
    return 'challenges'
  })
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState('')
  const [submissionToken, setSubmissionToken] = useState(0)
  const [resultsToken, setResultsToken] = useState(0)
  const [editingName, setEditingName] = useState(false)
  const [nextName, setNextName] = useState('')
  const [nameError, setNameError] = useState('')
  const [savingName, setSavingName] = useState(false)

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
  if (!isSupabaseConfigured) return <SetupRequired onTutorial={() => setView('tutorial')} onPalette={() => setView('palette')} />
  if (loading) return <div className="loading-screen"><div className="brand"><b>HOUSE</b><span>PHOTO HUNT</span></div><span>Opening the door…</span></div>
  if (error) return <main className="error-page"><h1>Couldn’t open the party.</h1><p>{error}</p><button className="button" onClick={() => location.reload()}>Try again</button></main>
  if (user && !profile && view === 'tutorial') return <main className="public-tutorial"><Tutorial onBack={() => setView('challenges')} /></main>
  if (user && !profile && view === 'palette') return <main className="public-palette"><Palette onBack={() => setView('challenges')} /></main>
  if (user && profile && !isHomeEntry && view === 'tutorial') return <main className="public-tutorial"><Tutorial onBack={() => setView('challenges')} /></main>
  if (user && profile && !isHomeEntry) return <JoinForm user={user} profile={profile} onJoined={(nextProfile) => { setProfile(nextProfile); location.assign(homeUrl) }} onTutorial={() => setView('tutorial')} />
  if (user && !profile) return <JoinForm user={user} onJoined={(nextProfile) => { setProfile(nextProfile); if (!isHomeEntry) location.assign(homeUrl) }} onTutorial={() => setView('tutorial')} />
  if (!user || !profile) return null
  const currentUser = user
  const currentProfile = profile

  async function saveName(event: React.FormEvent) {
    event.preventDefault()
    if (nextName.trim().length < 2) return
    setSavingName(true)
    setNameError('')
    try {
      setProfile(await updateProfile(currentUser.id, nextName))
      setEditingName(false)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Could not change your name.'
      setNameError(message.includes('profiles_display_name_unique') ? 'That name is already taken.' : message)
    } finally {
      setSavingName(false)
    }
  }

  function openNameEditor() {
    setNextName(currentProfile.display_name)
    setNameError('')
    setEditingName(true)
  }

  if (view === 'display') {
    return <DisplayView challenges={challenges} refreshToken={resultsToken} onExit={() => setView('challenges')} />
  }

  return (
    <div className="app-shell">
      <SiteHeader active={view} onSelect={setView} playerName={profile.display_name} onEditProfile={openNameEditor} />

      <div className="mobile-timer"><Timer compact /></div>
      <main className="content">
        {view === 'challenges' && <><Timer /><ChallengeList challenges={challenges} userId={user.id} refreshToken={submissionToken} onChanged={() => { setSubmissionToken((value) => value + 1); setResultsToken((value) => value + 1) }} /></>}
        {view === 'tutorial' && <Tutorial />}
        {view === 'palette' && <Palette />}
        {view === 'vote' && <VoteView challenges={challenges} userId={user.id} refreshToken={submissionToken} onChanged={() => setResultsToken((value) => value + 1)} />}
        {view === 'leaderboard' && <Leaderboard refreshToken={resultsToken} />}
      </main>

      <MobileNavigation active={view} onSelect={setView} />

      {editingName && (
        <div className="name-dialog" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingName(false) }}>
          <form role="dialog" aria-modal="true" aria-labelledby="name-dialog-title" onSubmit={saveName}>
            <span className="eyebrow">Your party identity</span>
            <h2 id="name-dialog-title">Change your name</h2>
            <label htmlFor="edit-name">Display name</label>
            <input id="edit-name" maxLength={24} value={nextName} onChange={(event) => setNextName(event.target.value)} placeholder="Your name" autoFocus />
            {nameError && <p className="form-error">{nameError}</p>}
            <div>
              <button className="button" type="button" onClick={() => setEditingName(false)}>Cancel</button>
              <button className="button button--dark" disabled={savingName || nextName.trim().length < 2}>{savingName ? 'Saving…' : 'Save name'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
