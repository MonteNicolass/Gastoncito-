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
    <div className="rounded-2xl bg-white dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-blue-500" />
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Gasto mensual
        </h3>
      </div>

      {/* Big number + delta */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
            {formatARS(currentSpend)}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Prom. histórico: {formatARS(average)}
          </p>
        </div>

        {deltaPercent !== 0 && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${trendCfg.bg}`}>
            <TrendIcon className={`w-3.5 h-3.5 ${trendCfg.color}`} />
            <span className={`text-sm font-semibold ${trendCfg.color}`}>
              {deltaPercent > 0 ? '+' : ''}{deltaPercent}%
            </span>
          </div>
        )}
      </div>

      {/* Mini bar chart */}
      {months.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-end gap-2 h-16">
            {months.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    m.isCurrent
                      ? 'bg-blue-500 dark:bg-blue-400'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                  style={{ height: `${Math.max(8, m.percent)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {months.map((m, i) => (
              <div key={i} className="flex-1 text-center">
                <span className={`text-[10px] ${
                  m.isCurrent ? 'text-blue-500 font-semibold' : 'text-zinc-400'
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
