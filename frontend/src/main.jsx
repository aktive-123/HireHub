import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Last line of defence. The per-layout boundaries keep the navigation
        usable when a single page throws; this catches anything that fails
        above them (a broken layout, a bad context value) so the user still
        gets a readable message instead of a blank document. */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
