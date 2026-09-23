import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

/** Shared key with the no-flash script in index.html. */
const STORAGE_KEY = 'cpg-theme'

function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  // The inline script in index.html applies data-theme before React mounts,
  // so reading it here keeps the UI in sync and avoids a flash on load.
  const applied = document.documentElement.getAttribute('data-theme')
  if (applied === 'dark' || applied === 'light') return applied
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/**
 * The single global light/dark controller for the whole site.
 *
 * Applies the theme to <html data-theme="..."> (which theme.css keys off) and
 * persists the choice to localStorage. Mount it from one control — the header
 * ThemeToggle — so switching updates every page at once and survives reloads.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // localStorage may be unavailable (private mode); the theme still
      // applies for the current session.
    }
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle, setTheme }
}
