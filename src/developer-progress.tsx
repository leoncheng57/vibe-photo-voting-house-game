import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GitHubProgress } from './components/GitHubProgress'
import { DeveloperBanner, DeveloperTabs, MobileNavigation, SiteHeader } from './components/SiteNavigation'
import './navigation.css'
import './developer-progress.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteHeader active="developer" />
    <DeveloperTabs active="progress" />
    <DeveloperBanner />
    <GitHubProgress />
    <MobileNavigation active="developer" />
  </StrictMode>,
)
