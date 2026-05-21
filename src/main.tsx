import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/auth-context.tsx'
import { RoleProvider } from './context/role-context.tsx'
import { ThemeProvider } from './context/theme-context.tsx'
import { ErrorBoundary } from './components/error-boundary.tsx'
import App from './App.tsx'

// Feature-data providers (Members, Events, Tasks, Finance, Sponsors) are mounted
// inside App.tsx AFTER authentication. Mounting them here would cause every
// provider to fire its initial Supabase load before the user is signed in,
// resulting in unauthenticated queries, ghost network calls, and duplicate
// state when the authenticated tree mounts the providers a second time.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <RoleProvider>
              <App />
            </RoleProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)