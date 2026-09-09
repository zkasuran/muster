'use client'

import { useEffect, useState } from 'react'

/**
 * The light/dark switch. The theme class is set on <html> before paint by the inline script in the
 * layout, so this control only reads the current class and toggles it, then remembers the choice.
 * It shows the mode it will switch TO, which is the label a user scans for.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light' | null>(null)

  // Read the class the inline script set, after paint. Deferred to a rAF so the read is not a
  // synchronous setState inside the effect body, which cascades a render; the placeholder holds
  // for that one frame and never flashes the wrong glyph because the class is already correct.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark'),
    )
    return () => cancelAnimationFrame(id)
  }, [])

  function flip() {
    const next = document.documentElement.classList.contains('light') ? 'dark' : 'light'
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(next)
    try {
      localStorage.setItem('muster-theme', next)
    } catch {
      // storage blocked, the choice just does not persist
    }
    setTheme(next)
  }

  // Before hydration the class is already correct from the inline script, so a stable placeholder
  // avoids a hydration mismatch and never flashes the wrong glyph.
  const label = theme === 'light' ? 'Dark' : 'Light'
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={theme ? `Switch to ${label.toLowerCase()} mode` : 'Switch theme'}
      className="rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-dim hover:border-brand hover:text-brand"
    >
      {theme ? label : 'Theme'}
    </button>
  )
}
