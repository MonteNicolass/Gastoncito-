'use client'

import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ListRow from '@/components/ui/ListRow'

export default function MasPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Más" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Configuración */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Configuración
          </h2>
          <Card className="overflow-hidden">
            <ListRow label="Reglas" href="/mas/reglas" />
            <ListRow label="Categorías" href="/mas/categorias" />
            <ListRow label="Backup & Datos" href="/mas/backup" />
            <ListRow label="Ajustes" href="/mas/settings" />
          </Card>
        </div>

        {/* Otras secciones */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Otras secciones
          </h2>
          <Card className="overflow-hidden">
            <ListRow label="Budgets" href="/budgets" disabled />
            <ListRow label="Objetivos" href="/objetivos" disabled />
            <ListRow label="Crypto" href="/crypto" disabled />
            <ListRow label="Notas" href="/notas" disabled />
            <ListRow label="Comportamiento" href="/comportamiento" disabled />
          </Card>
        </div>
      </div>
    </div>
  )
}
