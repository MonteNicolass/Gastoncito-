'use client'

import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ListRow from '@/components/ui/ListRow'

export default function FisicoPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Físico" />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Card className="overflow-hidden">
          <ListRow label="Hábitos" href="/fisico/habitos" />
          <ListRow label="Salud" href="/fisico/salud" />
          <ListRow label="Entrenos" href="/fisico/entrenos" />
        </Card>
      </div>
    </div>
  )
}
