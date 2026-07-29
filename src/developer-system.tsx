import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DeveloperBanner, DeveloperTabs, MobileNavigation, SiteHeader } from './components/SiteNavigation'
import { DatabaseDesign, HostPasswordRunbook, SecurityOps, SystemDiagram } from './components/SystemDiagram'
import './navigation.css'
import './developer-system.css'

const page = location.pathname.includes('/db-design') ? 'database' : location.pathname.includes('/security-ops') ? 'security' : location.pathname.includes('/host-runbook') ? 'runbook' : 'system'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteHeader active="developer" />
    <DeveloperBanner />
    <DeveloperTabs active={page} />
    {page === 'database' ? <DatabaseDesign /> : page === 'security' ? <SecurityOps /> : page === 'runbook' ? <HostPasswordRunbook /> : <SystemDiagram />}
    <MobileNavigation active="developer" />
  </StrictMode>,
)
