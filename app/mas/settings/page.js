'use client'

import { useState, useEffect, useRef } from 'react'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Switch from '@/components/ui/Switch'
import {
  Sun,
  Moon,
  Download,
  Upload,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState('light')
  const [exportStatus, setExportStatus] = useState(null) // null | 'loading' | 'done' | 'error'
  const [importStatus, setImportStatus] = useState(null) // null | 'loading' | 'done' | 'error'
  const [importError, setImportError] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const fileInputRef = useRef(null)

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

  const handleExport = async () => {
    try {
      setExportStatus('loading')
      const { exportFullBackup } = await import('@/lib/db/export-import')
      const json = await exportFullBackup()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gastoncito-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportStatus('done')
      setTimeout(() => setExportStatus(null), 3000)
    } catch {
      setExportStatus('error')
      setTimeout(() => setExportStatus(null), 3000)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setImportStatus('loading')
      setImportError('')
      const text = await file.text()
      const { importFullBackup } = await import('@/lib/db/export-import')
      const result = await importFullBackup(text)

      if (result.ok) {
        setImportStatus('done')
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setImportError(result.error || 'Error al importar')
        setImportStatus('error')
        setTimeout(() => setImportStatus(null), 4000)
      }
    } catch {
      setImportError('Archivo inválido')
      setImportStatus('error')
      setTimeout(() => setImportStatus(null), 4000)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleReset = async () => {
    try {
      setResetting(true)
      const { resetApp } = await import('@/lib/db/export-import')
      await resetApp()
      window.location.reload()
    } catch {
      setResetting(false)
      setShowResetConfirm(false)
    }
  }

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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* ── Apariencia ── */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Apariencia
          </h2>
          <Card className="p-4">
            <div className="flex justify-between items-center min-h-[44px]">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-indigo-500" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Modo oscuro
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {theme === 'dark' ? 'Activado' : 'Desactivado'}
                  </div>
                </div>
              </div>
              <Switch checked={theme === 'dark'} onChange={handleThemeToggle} />
            </div>
          </Card>
        </div>

        {/* ── Datos ── */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Datos
          </h2>
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {/* Export */}
            <button
              onClick={handleExport}
              disabled={exportStatus === 'loading'}
              className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors min-h-[44px] disabled:opacity-50"
            >
              {exportStatus === 'loading' ? (
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
              ) : exportStatus === 'done' ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : (
                <Download className="w-5 h-5 text-blue-500" />
              )}
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Exportar datos
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {exportStatus === 'done' ? 'Descargado' : 'Backup completo en JSON'}
                </div>
              </div>
            </button>

            {/* Import */}
            <button
              onClick={handleImportClick}
              disabled={importStatus === 'loading'}
              className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors min-h-[44px] disabled:opacity-50"
            >
              {importStatus === 'loading' ? (
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
              ) : importStatus === 'done' ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : importStatus === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              ) : (
                <Upload className="w-5 h-5 text-purple-500" />
              )}
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Importar datos
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {importStatus === 'done'
                    ? 'Importado. Recargando...'
                    : importStatus === 'error'
                      ? importError
                      : 'Restaurar desde backup JSON'}
                </div>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />

            {/* Reset */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors min-h-[44px]"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-red-600 dark:text-red-400">
                  Resetear app
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Eliminar todos los datos
                </div>
              </div>
            </button>
          </Card>
        </div>

        {/* ── Legal ── */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Legal
          </h2>
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            <a
              href="https://gastoncito.app/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors min-h-[44px]"
            >
              <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Privacidad
              </span>
              <ExternalLink className="w-4 h-4 text-zinc-400" />
            </a>
            <a
              href="https://gastoncito.app/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors min-h-[44px]"
            >
              <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Términos de uso
              </span>
              <ExternalLink className="w-4 h-4 text-zinc-400" />
            </a>
          </Card>
        </div>

        {/* ── Info ── */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Info
          </h2>
          <Card className="p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Versión</span>
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">1.0.0</span>
            </div>
            <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Base de datos</span>
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">IndexedDB v12</span>
            </div>
            <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Almacenamiento</span>
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Local-first</span>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Reset Confirmation Modal ── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !resetting && setShowResetConfirm(false)}
          />
          <div className="relative w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-t-3xl p-6 space-y-4 animate-slide-up">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Resetear app
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Se eliminarán todos los datos. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={handleReset}
                disabled={resetting}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {resetting ? 'Eliminando...' : 'Confirmar reset'}
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
                className="w-full py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm transition-all active:scale-[0.97]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
