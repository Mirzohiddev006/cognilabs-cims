import { useState, type PropsWithChildren } from 'react'
import { AppShellContext } from './AppShellContext'

export function AppShellProvider({ children }: PropsWithChildren) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  function openSidebar() {
    setIsSidebarOpen(true)
  }

  function closeSidebar() {
    setIsSidebarOpen(false)
  }

  function toggleSidebar() {
    setIsSidebarOpen((current) => !current)
  }

  return (
    <AppShellContext.Provider
      value={{
        isSidebarOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar,
      }}
    >
      {children}
    </AppShellContext.Provider>
  )
}
