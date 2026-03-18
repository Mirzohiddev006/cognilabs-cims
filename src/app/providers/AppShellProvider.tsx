import { useState, type PropsWithChildren } from 'react'
import { AppShellContext } from './AppShellContext'

export function AppShellProvider({ children }: PropsWithChildren) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isSidebarCollapsed = false

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
    // Desktop sidebar collapse was intentionally removed in favor of a fixed rail.
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
