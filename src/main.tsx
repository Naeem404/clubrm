import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/auth-context.tsx'
import { RoleProvider } from './context/role-context.tsx'
import { ThemeProvider } from './context/theme-context.tsx'
import { ToastProvider } from './context/toast-context.tsx'
import { ToastContainer } from './components/ui/toast.tsx'
import App from './App.tsx'

// Data providers (Members/Sponsors/Events/Tasks/Finance) are mounted inside
// App.tsx, only for authenticated users and keyed by user id.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <RoleProvider>
              <App />
            </RoleProvider>
          </AuthProvider>
          <ToastContainer />
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
