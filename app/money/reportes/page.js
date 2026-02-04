'use client'

import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

export default function ReportesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Reportes" backHref="/money" />
      
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4">📈</div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Próximamente
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Esta función estará disponible pronto
          </p>
        </Card>
      </div>
    </div>
  )
}
