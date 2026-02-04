'use client'

import { useState, useEffect } from 'react'
import { initDB, exportMovimientosJSON, exportMovimientosCSV, exportBackupJSON, importBackupJSON, clearAll, getSettings, setSetting } from '@/lib/storage'

export default function MasPage() {
  const [confirmMode, setConfirmMode] = useState(false)
  const [allowAI, setAllowAI] = useState(false)

  useEffect(() => {
    const load = async () => {
      await initDB()
      const settings = await getSettings()
      setConfirmMode(settings.confirm || false)
      setAllowAI(settings.allow_ai || false)
    }
    load()
  }, [])

  const handleToggleConfirm = async () => {
    const newValue = !confirmMode
    setConfirmMode(newValue)
    await setSetting('confirm', newValue)
  }

  const handleToggleAI = async () => {
    const newValue = !allowAI
    setAllowAI(newValue)
    await setSetting('allow_ai', newValue)
  }

  const handleExportJSON = async () => {
    const json = await exportMovimientosJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gaston-movimientos-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const handleExportCSV = async () => {
    const csv = await exportMovimientosCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gaston-movimientos-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const handleExportBackup = async () => {
    const backup = await exportBackupJSON()
    const blob = new Blob([backup], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gaston-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const handleImportBackup = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      const text = await file.text()
      if (!confirm('¿Importar backup? Esto reemplazará todos los datos actuales.')) return

      try {
        await importBackupJSON(text)
        alert('Backup importado exitosamente')
        window.location.reload()
      } catch (error) {
        alert('Error importando backup: ' + error.message)
      }
    }
    input.click()
  }

  const handleClearAll = async () => {
    if (!confirm('¿ELIMINAR TODOS LOS DATOS? Esta acción no se puede deshacer.')) return
    if (!confirm('¿Estás COMPLETAMENTE seguro? Se perderán todos los movimientos, saldos y configuraciones.')) return

    await clearAll()
    alert('Todos los datos eliminados')
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <header className="border-b border-stone-200 bg-white px-4 py-3 sticky top-0">
        <h1 className="text-sm font-bold">Más</h1>
        <p className="text-xs text-stone-500">Configuración y datos</p>
      </header>

      <div className="p-4 space-y-4">
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold mb-3">Configuración</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm font-medium">Modo confirmación</div>
                <div className="text-xs text-stone-500">Pedir confirmación antes de guardar</div>
              </div>
              <button
                onClick={handleToggleConfirm}
                className={`text-xs px-4 py-2 rounded-full border transition-colors ${
                  confirmMode
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'border-stone-300 text-stone-600 hover:bg-stone-100'
                }`}
              >
                {confirmMode ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm font-medium">Permitir análisis con IA</div>
                <div className="text-xs text-stone-500">Habilita análisis automático de gastos</div>
              </div>
              <button
                onClick={handleToggleAI}
                className={`text-xs px-4 py-2 rounded-full border transition-colors ${
                  allowAI
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'border-stone-300 text-stone-600 hover:bg-stone-100'
                }`}
              >
                {allowAI ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold mb-3">Exportar movimientos</h2>
          <div className="space-y-2">
            <button
              onClick={handleExportJSON}
              className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-50"
            >
              Exportar JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-50"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold mb-3">Backup completo</h2>
          <p className="text-xs text-stone-500 mb-3">
            Incluye movimientos, saldos, configuración, objetivos, reglas, crypto y más.
          </p>
          <div className="space-y-2">
            <button
              onClick={handleExportBackup}
              className="w-full rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700"
            >
              Exportar backup
            </button>
            <button
              onClick={handleImportBackup}
              className="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-50"
            >
              Importar backup
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-semibold text-red-900 mb-3">Zona peligrosa</h2>
          <button
            onClick={handleClearAll}
            className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Eliminar todos los datos
          </button>
        </div>
      </div>
    </div>
  )
}