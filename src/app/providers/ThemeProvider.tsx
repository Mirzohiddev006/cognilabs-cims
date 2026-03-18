import { useEffect, useState, type PropsWithChildren } from 'react'
import { ThemeContext, type Theme } from './ThemeContext'

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('cims-theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return 'dark'
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    try {
      localStorage.setItem('cims-theme', theme)
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
