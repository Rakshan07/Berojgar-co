import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Suppress benign ResizeObserver loop notifications from canvas resizing
if (typeof window !== 'undefined') {
  window.addEventListener('error', e => {
    if (e.message && (e.message.includes('ResizeObserver loop completed') || e.message.includes('ResizeObserver loop limit exceeded'))) {
      e.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
