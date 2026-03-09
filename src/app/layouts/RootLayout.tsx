import { Outlet } from 'react-router-dom'
import { AppShellProvider } from '../providers/AppShellProvider'
import { AppHeader } from '../../widgets/navigation/AppHeader'
import { AppSidebar } from '../../widgets/navigation/AppSidebar'

export function RootLayout() {
  return (
    <AppShellProvider>
      <div className="app-shell-grid">
        <AppSidebar />
        <div className="grid-overlay relative flex min-h-screen flex-col">
          <AppHeader />
          <main className="app-shell-main relative z-10 flex-1 px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </AppShellProvider>
  )
}
