'use client'

import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ListRow from '@/components/ui/ListRow'

export default function MasPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Más" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Secciones
          </h3>
          <Card className="overflow-hidden">
            <ListRow label="💬 Chat" href="/chat" />
            <ListRow label="🎯 Objetivos" href="/objetivos" />
            <ListRow label="🔍 Comportamiento" href="/comportamiento" />
            <ListRow label="📈 Insights" href="/insights" />
          </Card>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Configuración
          </h3>
          <Card className="overflow-hidden">
            <ListRow label="Configuración" href="/mas/settings" />
            <ListRow label="Reglas" href="/mas/reglas" />
            <ListRow label="Categorías" href="/mas/categorias" />
            <ListRow label="Backup & Datos" href="/mas/backup" />
          </Card>
        </div>
      </div>
    </div>
  )
}
