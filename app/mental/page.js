'use client'

import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ListRow from '@/components/ui/ListRow'

export default function MentalPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Mental" />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Card className="overflow-hidden">
          <ListRow label="Estado" href="/mental/estado" />
          <ListRow label="Diario" href="/mental/diario" />
          <ListRow label="Objetivos" href="/mental/objetivos" />
          <ListRow label="Insights" href="/mental/insights" />
        </Card>
      </div>
    </div>
  )
}
