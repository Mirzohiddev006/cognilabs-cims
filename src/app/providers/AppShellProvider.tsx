import { useEffect, useState, type PropsWithChildren } from 'react'
import { AppShellContext } from './AppShellContext'

export function AppShellProvider({ children }: PropsWithChildren) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 960px)')

    function syncSidebarMode(event?: MediaQueryList | MediaQueryListEvent) {
      if ((event ?? mediaQuery).matches) {
        setIsSidebarCollapsed(false)
      }
    }

    syncSidebarMode()
    mediaQuery.addEventListener('change', syncSidebarMode)

    return () => {
      mediaQuery.removeEventListener('change', syncSidebarMode)
    }
  }, [])

  function openSidebar() {
    setIsSidebarOpen(true)
  }

  function closeSidebar() {
    setIsSidebarOpen(false)
  }

  function toggleSidebar() {
    setIsSidebarOpen((current) => !current)
  }

  function toggleSidebarCollapsed() {
    setIsSidebarCollapsed((current) => !current)
  }

  return (
    <AppShellContext.Provider
      value={{
        isSidebarOpen,
        isSidebarCollapsed,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        toggleSidebarCollapsed,
      }}
    >
      {children}
    </AppShellContext.Provider>
  )
}
