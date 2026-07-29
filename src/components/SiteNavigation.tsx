import type { View } from '../types'

const appRoot = import.meta.env.BASE_URL
const homeUrl = `${appRoot}home/`
const systemUrl = `${appRoot}developer/system/`
const databaseUrl = `${appRoot}developer/db-design/`
const securityUrl = `${appRoot}developer/security-ops/`
const runbookUrl = `${appRoot}developer/host-runbook/`
const progressUrl = `${appRoot}developer/github-progress/`
const developerUrl = progressUrl

const navigationItems: Array<{ id: View; label: string; href: string; icon?: 'tv' }> = [
  { id: 'challenges', label: 'Home', href: homeUrl },
  { id: 'tutorial', label: 'How to play', href: `${homeUrl}?tutorial` },
  { id: 'palette', label: 'Palette', href: `${homeUrl}?palette` },
  { id: 'vote', label: 'Vote', href: `${homeUrl}?vote` },
  { id: 'leaderboard', label: 'Scores', href: `${homeUrl}?leaderboard` },
  { id: 'display', label: 'TV mode', href: `${homeUrl}?display`, icon: 'tv' },
]

type NavigationProps = {
  active: View | 'developer'
  onSelect?: (view: View) => void
}

function RobotIcon() {
  return (
    <svg className="developer-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v3M9.5 3h5M5 9.5A2.5 2.5 0 0 1 7.5 7h9A2.5 2.5 0 0 1 19 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 16.5zM8.5 12h.01M15.5 12h.01M9 16h6M2.5 12v4M21.5 12v4" />
    </svg>
  )
}

function TvIcon() {
  return (
    <svg className="tv-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 3 4 4 4-4M5 8h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Zm2 4h7v5H7Zm11 .5h.01M18 16h.01" />
    </svg>
  )
}

function NavigationLinks({ active, onSelect }: NavigationProps) {
  return (
    <>
      {navigationItems.map((item) => onSelect ? (
        <button key={item.id} className={`${active === item.id ? 'active' : ''} ${item.icon ? 'nav-with-icon' : ''}`} onClick={() => onSelect(item.id)}>{item.icon === 'tv' && <TvIcon />}{item.label}</button>
      ) : (
        <a key={item.id} className={`${active === item.id ? 'active' : ''} ${item.icon ? 'nav-with-icon' : ''}`} href={item.href}>{item.icon === 'tv' && <TvIcon />}{item.label}</a>
      ))}
      <a className={`developer-link ${active === 'developer' ? 'active' : ''}`} href={developerUrl}><RobotIcon />Developer</a>
    </>
  )
}

type SiteHeaderProps = NavigationProps & {
  playerName?: string
  onEditProfile?: () => void
}

export function SiteHeader({ active, onSelect, playerName, onEditProfile }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <a className="brand brand--button" href={appRoot}><b>HOUSE</b><span>PHOTO HUNT</span></a>
      <nav aria-label="Primary navigation"><NavigationLinks active={active} onSelect={onSelect} /></nav>
      {playerName && onEditProfile ? (
        <button className="player-chip" onClick={onEditProfile}><span>Playing as · change</span><strong>{playerName}</strong></button>
      ) : (
        <a className="developer-back" href={homeUrl}><span>Developer tools</span><strong>Back to game →</strong></a>
      )}
    </header>
  )
}

export function MobileNavigation(props: NavigationProps) {
  return <nav className="mobile-nav" aria-label="Mobile navigation"><NavigationLinks {...props} /></nav>
}

export function DeveloperTabs({ active }: { active: 'system' | 'database' | 'security' | 'runbook' | 'progress' }) {
  return (
    <nav className="developer-tabs" aria-label="Developer pages">
      <a className={active === 'progress' ? 'active' : ''} href={progressUrl}>GitHub project progress</a>
      <a className={active === 'system' ? 'active' : ''} href={systemUrl}>System reference</a>
      <a className={active === 'database' ? 'active' : ''} href={databaseUrl}>DB design</a>
      <a className={active === 'security' ? 'active' : ''} href={securityUrl}>Security and Ops</a>
      <a className={active === 'runbook' ? 'active' : ''} href={runbookUrl}>Host Password Runbook</a>
    </nav>
  )
}

export function DeveloperBanner() {
  return (
    <aside className="developer-banner" aria-label="House Photo Hunt developer workspace">
      <strong>Developer Workspace</strong>
      <span className="developer-banner__robots" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => <RobotIcon key={index} />)}
      </span>
      <code>architecture · data · security · delivery</code>
    </aside>
  )
}
