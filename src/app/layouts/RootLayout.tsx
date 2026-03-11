import type { CSSProperties } from 'react'
import { Outlet } from 'react-router-dom'
import { useAppShell } from '../hooks/useAppShell'
import { AppShellProvider } from '../providers/AppShellProvider'
import { AppHeader } from '../../widgets/navigation/AppHeader'
import { AppSidebar } from '../../widgets/navigation/AppSidebar'

function RootLayoutFrame() {
  const { isSidebarCollapsed } = useAppShell()
  const shellStyle = {
    '--app-shell-sidebar-width': isSidebarCollapsed ? '96px' : '272px',
  } as CSSProperties

  return (
    <div className="app-shell-grid" style={shellStyle}>
      <AppSidebar />
      <div className="grid-overlay relative flex min-h-screen flex-col">
        <AppHeader />
        <main className="app-shell-main relative z-10 flex-1 px-4 pb-6 pt-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function RootLayout() {
  return (
    <AppShellProvider>
      <RootLayoutFrame />
    </AppShellProvider>
  )
}
