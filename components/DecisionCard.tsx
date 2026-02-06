'use client'

import Card from '@/components/ui/Card'
import {
  type FinancialDecision,
  getDecisionSummary,
} from '@/lib/decisions/decisionStore'
import {
  Calculator,
  ShoppingCart,
  BarChart3,
  Trash2,
} from 'lucide-react'

function formatDate(dateString: string): string {
  const d = new Date(dateString)
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const TYPE_CONFIG = {
  cuotas_vs_contado: {
    Icon: Calculator,
    color: 'text-zinc-600 dark:text-zinc-400',
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    label: 'Cuotas vs Contado',
  },
  carrito_optimizado: {
    Icon: ShoppingCart,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    label: 'Carrito',
  },
  comparacion_producto: {
    Icon: BarChart3,
    color: 'text-terra-500 dark:text-terra-400',
    bg: 'bg-terra-50 dark:bg-terra-900/20',
    label: 'Comparación',
  },
} as const

interface DecisionCardProps {
  decision: FinancialDecision
  onDelete?: (id: string) => void
  compact?: boolean
}

export default function DecisionCard({ decision, onDelete, compact = false }: DecisionCardProps) {
  const summary = getDecisionSummary(decision)
  const cfg = TYPE_CONFIG[decision.tipo]
  const Icon = cfg.Icon

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {summary.subtitle}
          </p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {cfg.label} · {formatDate(decision.fecha)}
          </p>
        </div>
        <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums flex-shrink-0">
          {summary.amount}
        </span>
      </div>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
            <span className="text-[10px] text-zinc-400">
              {formatDate(decision.fecha)}
            </span>
          </div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {summary.title}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {summary.subtitle}
          </p>

          {/* Type-specific details */}
          {decision.tipo === 'cuotas_vs_contado' && (
            <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
              <span>{decision.inputs.numCuotas} cuotas de ${new Intl.NumberFormat('es-AR').format(decision.inputs.cuota)}</span>
              <span>·</span>
              <span>Inflación {decision.inputs.inflacion}%</span>
            </div>
          )}

          {decision.tipo === 'carrito_optimizado' && (
            <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
              <span>{decision.items.length} productos</span>
              <span>·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                -{decision.ahorro_percent}%
              </span>
            </div>
          )}

          {decision.tipo === 'comparacion_producto' && (
            <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
              <span>{decision.tiendas_comparadas} tiendas</span>
              {decision.ahorro_vs_caro > 0 && (
                <>
                  <span>·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Ahorro: ${new Intl.NumberFormat('es-AR').format(decision.ahorro_vs_caro)}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
            {summary.amount}
          </span>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(decision.id) }}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
