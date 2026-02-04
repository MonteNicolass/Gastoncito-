'use client'

import { useState, useEffect } from 'react'
import { initDB, exportMovimientosJSON, exportMovimientosCSV, exportBackupJSON, importBackupJSON, clearAll, getSettings, setSetting } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ListRow from '@/components/ui/ListRow'
import Switch from '@/components/ui/Switch'

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
    <div className="flex flex-col min-h-screen">
      <TopBar title="Más" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Navegación a otras secciones */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Secciones
          </h2>
          <Card className="overflow-hidden">
            <ListRow label="Budgets" href="/budgets" />
            <ListRow label="Objetivos" href="/objetivos" />
            <ListRow label="Crypto" href="/crypto" />
            <ListRow label="Notas" href="/notas" />
            <ListRow label="Comportamiento" href="/comportamiento" />
            <ListRow label="Money" href="/money" />
          </Card>
        </div>

        {/* Configuración */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Configuración
          </h2>
          <Card className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Modo confirmación</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Pedir confirmación antes de guardar</div>
              </div>
              <Switch checked={confirmMode} onChange={handleToggleConfirm} />
            </div>

            <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Análisis con IA</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Habilita análisis automático</div>
              </div>
              <Switch checked={allowAI} onChange={handleToggleAI} />
            </div>
          </Card>
        </div>

        {/* Exportar movimientos */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Exportar movimientos
          </h2>
          <Card className="p-4 space-y-2">
            <Button
              onClick={handleExportJSON}
              variant="ghost"
              className="w-full justify-start"
            >
              📄 Exportar JSON
            </Button>
            <Button
              onClick={handleExportCSV}
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
              Incluye movimientos, saldos, configuración, objetivos, reglas, crypto y más.
            </p>
            <div className="space-y-2">
              <Button
                onClick={handleExportBackup}
                variant="primary"
                className="w-full"
              >
                Exportar backup
              </Button>
              <Button
                onClick={handleImportBackup}
                variant="secondary"
                className="w-full"
              >
                Importar backup
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
            <Button
              onClick={handleClearAll}
              variant="danger"
              className="w-full"
            >
              Eliminar todos los datos
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
