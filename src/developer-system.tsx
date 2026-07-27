import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DeveloperBanner, DeveloperTabs, MobileNavigation, SiteHeader } from './components/SiteNavigation'
import { DatabaseDesign, SecurityOps, SystemDiagram } from './components/SystemDiagram'
import './navigation.css'
import './developer-system.css'

const page = location.pathname.includes('/db-design') ? 'database' : location.pathname.includes('/security-ops') ? 'security' : 'system'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteHeader active="developer" />
    <DeveloperBanner />
    <DeveloperTabs active={page} />
    {page === 'database' ? <DatabaseDesign /> : page === 'security' ? <SecurityOps /> : <SystemDiagram />}
    <MobileNavigation active="developer" />
  </StrictMode>,
)
