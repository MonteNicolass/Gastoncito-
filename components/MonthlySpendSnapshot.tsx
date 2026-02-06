'use client'

import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MonthBar {
  label: string
  amount: number
  percent: number
  isCurrent: boolean
}

interface Props {
  currentSpend: number
  average: number
  deltaPercent: number
  trend: 'up' | 'down' | 'stable'
  months: MonthBar[]
}

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

const TREND_CONFIG = {
  up: { Icon: TrendingUp, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
  down: { Icon: TrendingDown, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  stable: { Icon: Minus, color: 'text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800' },
}

export default function MonthlySpendSnapshot({ currentSpend, average, deltaPercent, trend, months }: Props) {
  if (currentSpend <= 0) return null

  const trendCfg = TREND_CONFIG[trend]
  const TrendIcon = trendCfg.Icon

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-terra-500" strokeWidth={1.75} />
          <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
            Gasto mensual
          </h3>
        </div>
        {deltaPercent !== 0 && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${trendCfg.bg}`}>
            <TrendIcon className={`w-3 h-3 ${trendCfg.color}`} />
            <span className={`text-[10px] font-semibold font-mono ${trendCfg.color}`}>
              {deltaPercent > 0 ? '+' : ''}{deltaPercent}%
            </span>
          </div>
        )}
      </div>

      {/* Big number */}
      <div>
        <p className="text-3xl font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {formatARS(currentSpend)}
        </p>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
          Promedio: {formatARS(average)}
        </p>
      </div>

      {/* Mini bar chart */}
      {months.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-end gap-1.5 h-14 pt-2">
            {months.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div
                  className={`w-full rounded-sm transition-all ${
                    m.isCurrent
                      ? 'bg-terra-500 dark:bg-terra-400'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                  style={{ height: `${Math.max(8, m.percent)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            {months.map((m, i) => (
              <div key={i} className="flex-1 text-center">
                <span className={`text-[9px] font-mono ${
                  m.isCurrent ? 'text-terra-500 font-semibold' : 'text-zinc-400'
                }`}>
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
