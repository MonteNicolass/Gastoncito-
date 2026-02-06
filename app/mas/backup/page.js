'use client'

import { useState, useEffect } from 'react'
import { initDB, getMovimientos, getWallets, getGoals, clearAll } from '@/lib/storage'
import { exportMovimientosCSV, exportBilleterasCSV, exportPresupuestosCSV, exportObjetivosCSV } from '@/lib/exports'
import { createBackup, downloadBackup, restoreBackup, readBackupFile } from '@/lib/backup'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'

function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

export default function BackupPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [db, setDb] = useState(null)
  const [rangeType, setRangeType] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    initDB().then(setDb)
  }, [])

  const handleExportMovimientosCSV = async () => {
    if (!db) return
    setIsProcessing(true)
    try {
      const movimientos = await getMovimientos()
      exportMovimientosCSV(movimientos, rangeType, customStart, customEnd)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExportBilleterasCSV = async () => {
    if (!db) return
    setIsProcessing(true)
    try {
      const wallets = await getWallets()
      exportBilleterasCSV(wallets)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExportPresupuestosCSV = () => {
    setIsProcessing(true)
    try {
      const budgets = getBudgetsFromLocalStorage()
      exportPresupuestosCSV(budgets)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExportObjetivosCSV = async () => {
    if (!db) return
    setIsProcessing(true)
    try {
      const goals = await getGoals()
      exportObjetivosCSV(goals)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExportBackup = async () => {
    if (!db) return
    setIsProcessing(true)
    try {
      const backup = await createBackup(db)
      downloadBackup(backup)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImportBackup = async () => {
    if (!db) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      if (!confirm('¿Importar backup? Esto reemplazará todos los datos actuales.')) return

      setIsProcessing(true)
      try {
        const backupData = await readBackupFile(file)
        await restoreBackup(db, backupData)
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
    if (!confirm('ELIMINAR TODOS LOS DATOS\n\nEsta acción no se puede deshacer.')) return
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
        {/* Exportar CSV */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Exportar CSV
          </h2>
          <Card className="p-4 space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Descarga tus datos en formato CSV para Excel o Google Sheets
            </p>

            {/* Selector de rango para movimientos */}
            <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Rango de fechas (solo para Movimientos)
              </p>
              <Select
                value={rangeType}
                onChange={(e) => setRangeType(e.target.value)}
              >
                <option value="all">Todo</option>
                <option value="month">Este mes</option>
                <option value="custom">Personalizado</option>
              </Select>

              {rangeType === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                      Desde
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Botones de exportación */}
            <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <Button
                onClick={handleExportMovimientosCSV}
                disabled={isProcessing || !db}
                variant="ghost"
                className="w-full justify-start"
              >
                Exportar Movimientos
              </Button>
              <Button
                onClick={handleExportBilleterasCSV}
                disabled={isProcessing || !db}
                variant="ghost"
                className="w-full justify-start"
              >
                Exportar Billeteras
              </Button>
              <Button
                onClick={handleExportPresupuestosCSV}
                disabled={isProcessing}
                variant="ghost"
                className="w-full justify-start"
              >
                Exportar Presupuestos
              </Button>
              <Button
                onClick={handleExportObjetivosCSV}
                disabled={isProcessing || !db}
                variant="ghost"
                className="w-full justify-start"
              >
                Exportar Objetivos
              </Button>
            </div>
          </Card>
        </div>

        {/* Backup completo */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Backup completo
          </h2>
          <Card className="p-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              Incluye todo: movimientos, billeteras, presupuestos, objetivos, categorías, reglas, suscripciones, notas, vida (mental/físico) y configuraciones
            </p>
            <div className="space-y-2">
              <Button
                onClick={handleExportBackup}
                disabled={isProcessing}
                variant="primary"
                className="w-full"
              >
                {isProcessing ? 'Exportando...' : 'Exportar backup completo'}
              </Button>
              <Button
                onClick={handleImportBackup}
                disabled={isProcessing}
                variant="secondary"
                className="w-full"
              >
                {isProcessing ? 'Importando...' : 'Importar backup'}
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
              {isProcessing ? 'Eliminando...' : 'Eliminar todos los datos'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
