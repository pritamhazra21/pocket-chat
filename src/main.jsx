import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import './index.css'

// Size the app to the *visual* viewport so the on-screen keyboard shrinks the
// layout (composer stays above the keyboard) instead of pushing the header off-screen.
function setAppHeight() {
  const h = window.visualViewport?.height || window.innerHeight
  document.documentElement.style.setProperty('--app-height', h + 'px')
}
setAppHeight()
window.visualViewport?.addEventListener('resize', setAppHeight)
window.addEventListener('resize', setAppHeight)
window.addEventListener('orientationchange', setAppHeight)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)
