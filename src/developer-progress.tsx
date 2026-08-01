import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GitHubProgress } from './components/GitHubProgress'
import { DeveloperShell } from './components/SiteNavigation'
import './navigation.css'
import './developer-progress.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DeveloperShell active="progress">
      <GitHubProgress />
    </DeveloperShell>
  </StrictMode>,
)
