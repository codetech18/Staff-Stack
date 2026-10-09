import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'
import { startMonitoring, reportError } from './lib/monitoring'
startMonitoring()
window.addEventListener('unhandledrejection', (event) => reportError(event.reason))
window.addEventListener('error', (event) => reportError(event.error))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
