import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '../src/context/auth-context'
import { FinanceProvider } from '../src/context/finance-context'
import { SponsorsProvider } from '../src/context/sponsors-context'
import { EventsProvider } from '../src/context/events-context'
import { TasksProvider } from '../src/context/tasks-context'
import { MemoryRouter } from 'react-router-dom'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <MemoryRouter>
      <AuthProvider>
        <FinanceProvider>
          <SponsorsProvider>
            <EventsProvider>
              <TasksProvider>
                {children}
              </TasksProvider>
            </EventsProvider>
          </SponsorsProvider>
        </FinanceProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
