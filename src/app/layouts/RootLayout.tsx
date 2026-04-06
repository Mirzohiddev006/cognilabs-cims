import type { CSSProperties } from 'react'
import { Outlet } from 'react-router-dom'
import { useAppShell } from '../hooks/useAppShell'
import { useTheme } from '../hooks/useTheme'
import { AppShellProvider } from '../providers/AppShellProvider'
import { AppHeader } from '../../widgets/navigation/AppHeader'
import { AppSidebar } from '../../widgets/navigation/AppSidebar'
import { CimsAiLauncher } from '../../widgets/ai/CimsAiLauncher'

function RootLayoutFrame() {
  const { theme } = useTheme()
  const { isSidebarCollapsed } = useAppShell()
  const shellStyle = {
    '--app-shell-sidebar-width': isSidebarCollapsed ? '0px' : '272px',
  } as CSSProperties

  const isDark = theme === 'dark'

  return (
    <div className="app-shell-grid" style={shellStyle}>
      <AppSidebar />
      <div
        className="grid-overlay relative flex min-h-screen flex-col overflow-hidden"
        style={{
          background: isDark
            ? 'radial-gradient(circle at top, rgba(59,130,246,0.08), transparent 32%), linear-gradient(180deg, rgba(5,7,12,0.96), rgba(7,8,12,1))'
            : 'linear-gradient(180deg, #F7FAFD 0%, #F1F5F9 52%, #EDF2F7 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-72"
          style={{
            background: isDark
              ? 'radial-gradient(circle at top, rgba(59,130,246,0.12), transparent 70%)'
              : 'transparent',
          }}
        />
        <div
          className="pointer-events-none absolute right-0 top-28 z-0 h-72 w-72 rounded-full blur-3xl"
          style={{
            background: isDark ? 'rgba(59,130,246,0.08)' : 'transparent',
          }}
        />
        <AppHeader />
        <main className="app-shell-main relative z-10 flex-1 px-4 pb-6 pt-4 sm:px-6 lg:px-8">
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
