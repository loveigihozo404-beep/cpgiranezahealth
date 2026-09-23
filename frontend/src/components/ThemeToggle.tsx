import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'

/**
 * Accessible Sun/Moon control that switches the one global theme.
 * Rendered in the site header so it is reachable by keyboard and stays
 * available on mobile without interfering with the navigation menu.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
