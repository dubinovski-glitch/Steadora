import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'

// App entry point: mount the root <App /> into the #root element from index.html.
// StrictMode adds dev-only checks (double-invokes effects/renders) to surface side-effect bugs.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
