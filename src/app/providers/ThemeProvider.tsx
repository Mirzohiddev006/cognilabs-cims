import { useLayoutEffect, useState, type PropsWithChildren } from 'react'
import { ThemeContext, type Theme } from './ThemeContext'

const THEME_STORAGE_KEY = 'cims-theme'

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.classList.remove('light')
  root.style.colorScheme = theme
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useLayoutEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {}
  }, [theme])

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
