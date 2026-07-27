import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SystemDiagram } from './components/SystemDiagram'
import './developer-system.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SystemDiagram />
  </StrictMode>,
)
