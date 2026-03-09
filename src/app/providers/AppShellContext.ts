import { createContext } from 'react'

export type AppShellContextValue = {
  isSidebarOpen: boolean
  openSidebar: () => void
  closeSidebar: () => void
  toggleSidebar: () => void
}

export const AppShellContext = createContext<AppShellContextValue | null>(null)
