'use client'

import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ListRow from '@/components/ui/ListRow'

export default function MasPage() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar title="Más" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Áreas principales */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Áreas
          </h3>
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            <ListRow label="💪 Físico" href="/fisico" />
            <ListRow label="📝 Notas" href="/notas" />
            <ListRow label="🎯 Objetivos" href="/objetivos" />
            <ListRow label="🛠️ Herramientas" href="/herramientas" />
          </Card>
        </div>

        {/* Análisis */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Análisis
          </h3>
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            <ListRow label="🔍 Comportamiento" href="/comportamiento" />
            <ListRow label="📈 Insights cruzados" href="/insights" />
            <ListRow label="📅 Eventos" href="/eventos" />
            <ListRow label="📊 Historia" href="/historia" />
          </Card>
        </div>

        {/* Temporal */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Vistas temporales
          </h3>
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            <ListRow label="📆 Hoy" href="/hoy" />
            <ListRow label="📅 Semana" href="/semana" />
            <ListRow label="🗓️ Mes" href="/mes" />
          </Card>
        </div>

        {/* Configuración */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Configuración
          </h3>
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            <ListRow label="⚙️ Configuración" href="/mas/settings" />
            <ListRow label="📋 Reglas" href="/mas/reglas" />
            <ListRow label="🏷️ Categorías" href="/mas/categorias" />
            <ListRow label="💾 Backup & Datos" href="/mas/backup" />
            <ListRow label="🔎 Búsqueda" href="/busqueda" />
          </Card>
        </div>
      </div>
    </div>
  )
}
