import { useEffect, useRef, useState, type ReactNode } from 'react'
import { HomeIcon } from './HomeIcon'
import type { View } from '../types'

const appRoot = import.meta.env.BASE_URL
const playUrl = `${appRoot}play/`
const systemUrl = `${appRoot}developer/system/`
const databaseUrl = `${appRoot}developer/db-design/`
const securityUrl = `${appRoot}developer/security-ops/`
const runbookUrl = `${appRoot}developer/host-runbook/`
const photoExportUrl = `${appRoot}developer/photo-export/`
const progressUrl = `${appRoot}developer/github-progress/`
const repositoryFilesUrl = `${appRoot}developer/repository-files/`
const paletteUrl = `${appRoot}developer/palette/`
const developerUrl = progressUrl

const navigationItems: Array<{ id: View; label: string; href: string; icon?: 'tv' }> = [
  { id: 'challenges', label: 'Play', href: playUrl },
  { id: 'tutorial', label: 'How to play', href: `${playUrl}?tutorial` },
  { id: 'vote', label: 'Vote', href: `${playUrl}?vote` },
  { id: 'display', label: 'TV mode', href: `${playUrl}?display`, icon: 'tv' },
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
      <a className="home-link" href={appRoot} aria-label="Home"><HomeIcon /></a>
      {navigationItems.map((item) => onSelect ? (
        <button key={item.id} className={`${active === item.id ? 'active' : ''} ${item.icon ? 'nav-with-icon' : ''} ${item.id === 'display' ? 'tv-mode-link' : ''}`} aria-current={active === item.id ? 'page' : undefined} onClick={() => onSelect(item.id)}>{item.icon === 'tv' && <TvIcon />}{item.label}</button>
      ) : (
        <a key={item.id} className={`${active === item.id ? 'active' : ''} ${item.icon ? 'nav-with-icon' : ''} ${item.id === 'display' ? 'tv-mode-link' : ''}`} href={item.href} aria-current={active === item.id ? 'page' : undefined}>{item.icon === 'tv' && <TvIcon />}{item.label}</a>
      ))}
      <a className={`developer-link ${active === 'developer' ? 'active' : ''}`} href={developerUrl} aria-current={active === 'developer' ? 'page' : undefined}><RobotIcon />Developer</a>
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
        <a className="developer-back" href={playUrl}><span>Developer tools</span><strong>Back to game →</strong></a>
      )}
    </header>
  )
}

export function MobileNavigation(props: NavigationProps) {
  const navRef = useRef<HTMLElement>(null)
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false })

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    let revealFrame = 0

    const updateScrollEdges = () => {
      const maxScrollLeft = nav.scrollWidth - nav.clientWidth
      setScrollEdges({
        left: nav.scrollLeft > 1,
        right: nav.scrollLeft < maxScrollLeft - 1,
      })
    }
    const revealActive = () => {
      cancelAnimationFrame(revealFrame)
      revealFrame = requestAnimationFrame(() => {
        nav.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
          inline: 'center',
        })
      })
    }

    updateScrollEdges()
    nav.addEventListener('scroll', updateScrollEdges, { passive: true })
    const resizeObserver = new ResizeObserver(() => {
      updateScrollEdges()
      revealActive()
    })
    resizeObserver.observe(nav)
    window.addEventListener('resize', revealActive)

    return () => {
      cancelAnimationFrame(revealFrame)
      nav.removeEventListener('scroll', updateScrollEdges)
      resizeObserver.disconnect()
      window.removeEventListener('resize', revealActive)
    }
  }, [])

  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({
      behavior: 'auto',
      block: 'nearest',
      inline: 'center',
    })
  }, [props.active])

  const edgeClasses = [
    scrollEdges.left && 'mobile-nav-shell--left',
    scrollEdges.right && 'mobile-nav-shell--right',
  ].filter(Boolean).join(' ')

  return (
    <div className={`mobile-nav-shell ${edgeClasses}`}>
      <nav
        ref={navRef}
        className="mobile-nav"
        aria-label="Mobile navigation"
        onFocusCapture={(event) => event.target.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' })}
      >
        <NavigationLinks {...props} />
      </nav>
    </div>
  )
}

type DeveloperPage = 'system' | 'database' | 'security' | 'runbook' | 'export' | 'progress' | 'files' | 'palette'

export function DeveloperTabs({ active }: { active: DeveloperPage }) {
  return (
    <nav className="developer-tabs" aria-label="Developer pages">
      <a aria-current={active === 'progress' ? 'page' : undefined} className={active === 'progress' ? 'active' : ''} href={progressUrl}>GitHub project progress</a>
      <a aria-current={active === 'files' ? 'page' : undefined} className={active === 'files' ? 'active' : ''} href={repositoryFilesUrl}>Repository Files</a>
      <a aria-current={active === 'palette' ? 'page' : undefined} className={active === 'palette' ? 'active' : ''} href={paletteUrl}>Palette</a>
      <a aria-current={active === 'system' ? 'page' : undefined} className={active === 'system' ? 'active' : ''} href={systemUrl}>System reference</a>
      <a aria-current={active === 'database' ? 'page' : undefined} className={active === 'database' ? 'active' : ''} href={databaseUrl}>DB design</a>
      <a aria-current={active === 'security' ? 'page' : undefined} className={active === 'security' ? 'active' : ''} href={securityUrl}>Security and Ops</a>
      <a aria-current={active === 'runbook' ? 'page' : undefined} className={active === 'runbook' ? 'active' : ''} href={runbookUrl}>Host Password Runbook</a>
      <a aria-current={active === 'export' ? 'page' : undefined} className={active === 'export' ? 'active' : ''} href={photoExportUrl}>Photo Export Runbook</a>
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

export function DeveloperShell({ active, children }: { active: DeveloperPage; children: ReactNode }) {
  return (
    <>
      <SiteHeader active="developer" />
      <div className="developer-workspace">
        <DeveloperBanner />
        <DeveloperTabs active={active} />
        {children}
      </div>
      <MobileNavigation active="developer" />
    </>
  )
}
