'use client'

import { useState, useEffect } from 'react'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Switch from '@/components/ui/Switch'

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState('light')
  const [syncEnabled, setSyncEnabled] = useState(false)

  useEffect(() => {
    setMounted(true)
    const storedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = (storedTheme === 'dark' || storedTheme === 'light')
      ? storedTheme
      : (prefersDark ? 'dark' : 'light')
    setTheme(initialTheme)
  }, [])

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Ajustes" backHref="/mas" />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <Card className="p-4 animate-pulse">
            <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Ajustes" backHref="/mas" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Apariencia */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Apariencia
          </h2>
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Modo oscuro
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {theme === 'dark' ? 'Activado' : 'Desactivado'}
                </div>
              </div>
              <Switch checked={theme === 'dark'} onChange={handleThemeToggle} />
            </div>
          </Card>
        </div>

        {/* Sincronización (placeholder) */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Sincronización
          </h2>
          <Card className="p-4">
            <div className="flex justify-between items-center opacity-50">
              <div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Sync habilitado
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Próximamente
                </div>
              </div>
              <Switch
                checked={syncEnabled}
                onChange={() => {}}
                disabled
              />
            </div>
          </Card>
        </div>

        {/* Información */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Información
          </h2>
          <Card className="p-4 space-y-3">
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Versión</div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">1.0.0</div>
            </div>
            <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Base de datos</div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">IndexedDB v11</div>
            </div>
            <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
            <div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Almacenamiento</div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Local-first</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
