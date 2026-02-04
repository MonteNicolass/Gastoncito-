'use client'

import { useEffect, useState } from 'react'

export default function DarkToggle() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null)

  useEffect(() => {
    setMounted(true)

    const storedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = (storedTheme === 'dark' || storedTheme === 'light')
      ? storedTheme
      : (prefersDark ? 'dark' : 'light')
    setTheme(initialTheme)
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')
  }, [])

  useEffect(() => {
    if (!mounted || theme == null) return
    try {
      localStorage.setItem('theme', theme)
    } catch (e) {}
  }, [mounted, theme])

  function toggle() {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      if (next === 'dark') document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
      return next
    })
  }

  if (!mounted) {
    return null // Avoid rendering until mounted to prevent hydration mismatch
  }

  if (theme == null) return null

  return (
    <button
      aria-label="Toggle theme"
      onClick={toggle}
      className="p-2 rounded-md text-sm hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
