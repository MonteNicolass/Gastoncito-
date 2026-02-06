'use client'

import { useState, useMemo } from 'react'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import DecisionCard from '@/components/DecisionCard'
import {
  getDecisions,
  deleteDecision,
  type FinancialDecision,
  type DecisionType,
} from '@/lib/decisions/decisionStore'
import { ClipboardList, Filter } from 'lucide-react'

type FilterType = 'all' | DecisionType

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'carrito_optimizado', label: 'Carrito' },
  { value: 'cuotas_vs_contado', label: 'Cuotas' },
  { value: 'comparacion_producto', label: 'Comparaciones' },
]

export default function DecisionesPage() {
  const [decisions, setDecisions] = useState<FinancialDecision[]>(getDecisions())
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return decisions
    return decisions.filter(d => d.tipo === filter)
  }, [decisions, filter])

  function handleDelete(id: string) {
    deleteDecision(id)
    setDecisions(getDecisions())
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <TopBar
        title="Decisiones Financieras"
        backHref="/herramientas/financieras"
        action={null}
      />

      <div className="px-4 pt-4 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                filter === f.value
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Decision cards */}
        {filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <ClipboardList className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin decisiones guardadas
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {filter === 'all'
                ? 'Guardá análisis de cuotas, carritos optimizados o comparaciones de precios'
                : 'No hay decisiones de este tipo'}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(d => (
              <DecisionCard
                key={d.id}
                decision={d}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Stats */}
        {decisions.length > 0 && (
          <div className="px-1">
            <p className="text-[10px] text-zinc-400 text-center">
              {decisions.length} decisiones guardadas
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
