import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyTheme } from './lib/apply-theme'
import './navigation.css'
import './styles.css'

// Paint this app's own palette before the first render. The stylesheets fall
// back to the shared grey, which only the front page and developer pages keep.
applyTheme(null, document.documentElement)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
