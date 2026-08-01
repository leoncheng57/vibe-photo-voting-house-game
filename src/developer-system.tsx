import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DeveloperBanner, DeveloperTabs, MobileNavigation, SiteHeader } from './components/SiteNavigation'
import { Palette } from './components/Palette'
import { PhotoExportRunbook } from './components/PhotoExportRunbook'
import { DatabaseDesign, HostPasswordRunbook, SecurityOps, SystemDiagram } from './components/SystemDiagram'
import './navigation.css'
import './developer-system.css'

const page = location.pathname.includes('/palette')
  ? 'palette'
  : location.pathname.includes('/db-design')
    ? 'database'
    : location.pathname.includes('/security-ops')
      ? 'security'
      : location.pathname.includes('/host-runbook')
        ? 'runbook'
        : location.pathname.includes('/photo-export')
          ? 'export'
          : 'system'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteHeader active="developer" />
    <DeveloperBanner />
    <DeveloperTabs active={page} />
    {page === 'palette' ? <Palette /> : page === 'database' ? <DatabaseDesign /> : page === 'security' ? <SecurityOps /> : page === 'runbook' ? <HostPasswordRunbook /> : page === 'export' ? <PhotoExportRunbook /> : <SystemDiagram />}
    <MobileNavigation active="developer" />
  </StrictMode>,
)
