'use client'

import { Dumbbell } from 'lucide-react'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

export default function EntrenosPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Entrenos" backHref="/fisico" />
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-orange-500" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Próximamente</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Esta función estará disponible pronto</p>
        </Card>
      </div>
    </div>
  )
}
