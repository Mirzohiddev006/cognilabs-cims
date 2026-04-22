import type { CSSProperties } from 'react'
import { Outlet } from 'react-router-dom'
import { useAppShell } from '../hooks/useAppShell'
import { AppShellProvider } from '../providers/AppShellProvider'
import { AppHeader } from '../../widgets/navigation/AppHeader'
import { AppSidebar } from '../../widgets/navigation/AppSidebar'
import { CimsAiLauncher } from '../../widgets/ai/CimsAiLauncher'

function RootLayoutFrame() {
  const { isSidebarCollapsed } = useAppShell()
  const shellStyle = {
    '--app-shell-sidebar-width': isSidebarCollapsed ? '0px' : '240px',
  } as CSSProperties

  return (
    <div className="app-shell-grid" style={shellStyle}>
      <AppSidebar />
      <div className="relative flex min-h-screen flex-col bg-[var(--background)]">
        <AppHeader />
        <main className="app-shell-main flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
        <CimsAiLauncher />
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
