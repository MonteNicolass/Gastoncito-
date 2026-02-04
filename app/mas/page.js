'use client'

import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ListRow from '@/components/ui/ListRow'

export default function MasPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Más" />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Card className="overflow-hidden">
          <ListRow label="Configuración" href="/mas/settings" />
          <ListRow label="Reglas" href="/mas/reglas" />
          <ListRow label="Categorías" href="/mas/categorias" />
          <ListRow label="Backup & Datos" href="/mas/backup" />
        </Card>
      </div>
    </div>
  )
}
