'use client'

import { useEffect } from 'react'
import { initDB } from '@/lib/storage'
import { seedPredefinedCategories } from '@/lib/seed-categories'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ListRow from '@/components/ui/ListRow'

export default function MoneyPage() {
  useEffect(() => {
    initDB().then(() => seedPredefinedCategories())
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Money" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <Card className="overflow-hidden">
          <ListRow label="📊 Resumen Mensual" href="/money/resumen" />
          <ListRow label="Movimientos" href="/money/movimientos" />
          <ListRow label="Billeteras" href="/money/billeteras" />
          <ListRow label="Presupuestos" href="/money/presupuestos" />
          <ListRow label="Suscripciones" href="/money/suscripciones" />
          <ListRow label="Alertas" href="/money/alertas" />
          <ListRow label="Insights" href="/money/insights" />
        </Card>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Herramientas
          </h3>
          <Card className="p-4 space-y-3">
            <a
              href="https://ratoneando.com.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ratoneando → Comparar precios
            </a>
            <a
              href="https://miraprecios.com.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              MiraPrecios → Inflación y precios
            </a>
          </Card>
        </div>
      </div>
    </div>
  )
}
