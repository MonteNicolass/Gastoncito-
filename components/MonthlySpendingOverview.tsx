'use client'

import Card from '@/components/ui/Card'
import { TrendingUp, TrendingDown, Minus, Calendar, ChevronRight } from 'lucide-react'
import type { MonthlySpendingSummary, CategoryRank } from '@/lib/finance/monthlySpending'

interface Props {
  summary: MonthlySpendingSummary
  onCategoryClick?: (category: string) => void
}

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const TREND_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
}

const TREND_COLOR = {
  up: 'text-red-500',
  down: 'text-emerald-500',
  stable: 'text-zinc-400',
}

const TREND_BG = {
  up: 'bg-red-50 dark:bg-red-900/20',
  down: 'bg-emerald-50 dark:bg-emerald-900/20',
  stable: 'bg-zinc-100 dark:bg-zinc-800',
}

const CAT_COLORS = [
  'bg-terra-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-zinc-500',
  'bg-rose-500',
  'bg-zinc-400',
  'bg-zinc-600',
  'bg-zinc-300',
]

export default function MonthlySpendingOverview({ summary, onCategoryClick }: Props) {
  const TrendIcon = TREND_ICON[summary.trend]

  return (
    <div className="space-y-4">
      {/* Main spend card */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-terra-500" />
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {summary.currentMonth}
          </h3>
        </div>

        {/* Big number + delta */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
              {formatARS(summary.currentSpend)}
            </p>
            {summary.hasEnoughData && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Promedio mensual: {formatARS(summary.avgMonthlySpend)}
              </p>
            )}
          </div>

          {summary.hasEnoughData && summary.deltaVsAvgPercent !== 0 && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${TREND_BG[summary.trend]}`}>
              <TrendIcon className={`w-3.5 h-3.5 ${TREND_COLOR[summary.trend]}`} />
              <span className={`text-sm font-semibold ${TREND_COLOR[summary.trend]}`}>
                {summary.deltaVsAvgPercent > 0 ? '+' : ''}{summary.deltaVsAvgPercent}%
              </span>
            </div>
          )}
        </div>

        {/* Projection */}
        {summary.hasEnoughData && summary.daysRemaining > 0 && (
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Proyección fin de mes
              </span>
              <span className={`text-sm font-semibold font-mono tabular-nums ${
                summary.projectedDeltaPercent > 15
                  ? 'text-red-500'
                  : summary.projectedDeltaPercent < -10
                  ? 'text-emerald-500'
                  : 'text-zinc-700 dark:text-zinc-300'
              }`}>
                {formatARS(summary.projectedTotal)}
              </span>
            </div>
            {summary.projectedDeltaPercent !== 0 && (
              <p className="text-[10px] text-zinc-400 text-right mt-0.5">
                {summary.projectedDeltaPercent > 0 ? '+' : ''}{summary.projectedDeltaPercent}% vs promedio
              </p>
            )}
          </div>
        )}

        {/* Progress bar (days elapsed) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Día {summary.daysElapsed}</span>
            <span>{summary.daysRemaining} días restantes</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-terra-500 transition-all"
              style={{ width: `${Math.round((summary.daysElapsed / (summary.daysElapsed + summary.daysRemaining)) * 100)}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Category ranking */}
      {summary.categories.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Ranking por categoría
          </h3>

          <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {summary.categories.slice(0, 8).map((cat, i) => {
              const CatTrendIcon = TREND_ICON[cat.trend]
              return (
                <button
                  key={cat.name}
                  onClick={() => onCategoryClick?.(cat.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors active:scale-[0.99]"
                >
                  {/* Rank + color dot */}
                  <div className="flex items-center gap-2 w-8">
                    <div className={`w-2.5 h-2.5 rounded-full ${CAT_COLORS[i % CAT_COLORS.length]}`} />
                    <span className="text-xs font-bold text-zinc-400 tabular-nums">{cat.rank}</span>
                  </div>

                  {/* Name + percent bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {capitalize(cat.name)}
                      </p>
                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 ml-2 tabular-nums">
                        {cat.percent}%
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${CAT_COLORS[i % CAT_COLORS.length]} transition-all`}
                        style={{ width: `${cat.percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Amount + trend */}
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-sm font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatARS(cat.amount)}
                    </p>
                    {cat.prevAmount > 0 && (
                      <div className="flex items-center gap-0.5 justify-end mt-0.5">
                        <CatTrendIcon className={`w-3 h-3 ${TREND_COLOR[cat.trend]}`} />
                        <span className={`text-[10px] font-mono tabular-nums ${TREND_COLOR[cat.trend]}`}>
                          {cat.changePercent > 0 ? '+' : ''}{cat.changePercent}%
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </Card>
        </div>
      )}
    </div>
  )
}
