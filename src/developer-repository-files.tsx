import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RepositoryFiles } from './components/RepositoryFiles'
import { DeveloperBanner, DeveloperTabs, MobileNavigation, SiteHeader } from './components/SiteNavigation'
import './navigation.css'
import './developer-progress.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteHeader active="developer" />
    <DeveloperBanner />
    <DeveloperTabs active="files" />
    <RepositoryFiles />
    <MobileNavigation active="developer" />
  </StrictMode>,
)
