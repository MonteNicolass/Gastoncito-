'use client'

import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import { TrendingUp } from 'lucide-react'

export default function ReportesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Reportes" backHref="/money" />
      
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-zinc-500" />
            </div>
          </div>
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
