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
      <div className="grid-overlay relative flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_32%),linear-gradient(180deg,rgba(5,7,12,0.96),rgba(7,8,12,1))]">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_70%)]" />
        <div className="pointer-events-none absolute right-0 top-28 z-0 h-72 w-72 rounded-full bg-blue-500/8 blur-3xl" />
        <AppHeader />
        <main className="app-shell-main relative z-10 flex-1 px-4 pb-6 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
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
