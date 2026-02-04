'use client'

import { useState } from 'react'
import { exportMovimientosJSON, exportMovimientosCSV, exportBackupJSON, importBackupJSON, clearAll } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function BackupPage() {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleExportJSON = async () => {
    setIsProcessing(true)
    try {
      const json = await exportMovimientosJSON()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gaston-movimientos-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExportCSV = async () => {
    setIsProcessing(true)
    try {
      const csv = await exportMovimientosCSV()
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gaston-movimientos-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExportBackup = async () => {
    setIsProcessing(true)
    try {
      const backup = await exportBackupJSON()
      const blob = new Blob([backup], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gaston-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImportBackup = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      if (!confirm('¿Importar backup? Esto reemplazará todos los datos actuales.')) return

      setIsProcessing(true)
      try {
        const text = await file.text()
        await importBackupJSON(text)
        alert('Backup importado exitosamente. La página se recargará.')
        window.location.reload()
      } catch (error) {
        alert('Error importando backup: ' + error.message)
      } finally {
        setIsProcessing(false)
      }
    }
    input.click()
  }

  const handleClearAll = async () => {
    if (!confirm('⚠️ ¿ELIMINAR TODOS LOS DATOS?\n\nEsta acción no se puede deshacer.')) return
    if (!confirm('¿Estás COMPLETAMENTE seguro?\n\nSe perderán:\n- Movimientos\n- Saldos\n- Categorías personalizadas\n- Reglas\n- Suscripciones\n- Todas las configuraciones')) return

    setIsProcessing(true)
    try {
      await clearAll()
      alert('Todos los datos eliminados. La página se recargará.')
      window.location.reload()
    } catch (error) {
      alert('Error eliminando datos: ' + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Backup & Datos" backHref="/mas" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Exportar movimientos */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Exportar movimientos
          </h2>
          <Card className="p-4 space-y-2">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              Descarga solo los movimientos en formato JSON o CSV
            </p>
            <Button
              onClick={handleExportJSON}
              disabled={isProcessing}
              variant="ghost"
              className="w-full justify-start"
            >
              📄 Exportar JSON
            </Button>
            <Button
              onClick={handleExportCSV}
              disabled={isProcessing}
              variant="ghost"
              className="w-full justify-start"
            >
              📊 Exportar CSV
            </Button>
          </Card>
        </div>

        {/* Backup completo */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Backup completo
          </h2>
          <Card className="p-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              Incluye movimientos, saldos, billeteras, categorías, reglas, suscripciones y configuraciones
            </p>
            <div className="space-y-2">
              <Button
                onClick={handleExportBackup}
                disabled={isProcessing}
                variant="primary"
                className="w-full"
              >
                {isProcessing ? 'Exportando...' : '💾 Exportar backup completo'}
              </Button>
              <Button
                onClick={handleImportBackup}
                disabled={isProcessing}
                variant="secondary"
                className="w-full"
              >
                {isProcessing ? 'Importando...' : '📥 Importar backup'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Zona peligrosa */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 px-1">
            Zona peligrosa
          </h2>
          <Card className="p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <p className="text-xs text-red-700 dark:text-red-400 mb-3">
              Esta acción eliminará todos los datos de forma permanente. Asegurate de exportar un backup antes.
            </p>
            <Button
              onClick={handleClearAll}
              disabled={isProcessing}
              variant="danger"
              className="w-full"
            >
              {isProcessing ? 'Eliminando...' : '🗑️ Eliminar todos los datos'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
