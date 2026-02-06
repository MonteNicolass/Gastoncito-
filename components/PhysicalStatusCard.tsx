'use client'

import { Dumbbell, AlertTriangle, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react'

interface Props {
  daysSinceLast: number | null
  activitiesLast14: number
  trend: 'up' | 'down' | 'stable'
  streak: number
}

function getDaysColor(days: number | null): string {
  if (days === null) return 'text-zinc-400'
  if (days === 0) return 'text-emerald-600 dark:text-emerald-400'
  if (days <= 2) return 'text-emerald-600 dark:text-emerald-400'
  if (days <= 5) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function getDaysLabel(days: number | null): string {
  if (days === null) return 'Sin registros'
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

function getDaysBg(days: number | null): string {
  if (days === null || days > 5) return 'bg-red-100 dark:bg-red-900/30'
  if (days <= 2) return 'bg-emerald-100 dark:bg-emerald-900/30'
  return 'bg-amber-100 dark:bg-amber-900/30'
}

export default function PhysicalStatusCard({ daysSinceLast, activitiesLast14, trend, streak }: Props) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up'
    ? 'text-emerald-600 dark:text-emerald-400'
    : trend === 'down'
      ? 'text-red-600 dark:text-red-400'
      : 'text-zinc-500 dark:text-zinc-400'
  const trendLabel = trend === 'up' ? 'Más activo' : trend === 'down' ? 'Menos activo' : 'Estable'

  const isInactive = daysSinceLast !== null && daysSinceLast >= 7

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
          <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
            Actividad física
          </h3>
        </div>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span className="text-[10px] font-medium">{trendLabel}</span>
        </div>
      </div>

      {/* Days since last — BIG editorial */}
      <div className="flex items-center gap-4">
        <div>
          {daysSinceLast !== null ? (
            <span className={`text-4xl font-display font-bold tracking-tight ${getDaysColor(daysSinceLast)}`}>
              {daysSinceLast === 0 ? 'Hoy' : daysSinceLast}
            </span>
          ) : (
            <Clock className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
          )}
        </div>
        <div>
          <p className={`text-sm font-medium ${getDaysColor(daysSinceLast)}`}>
            {daysSinceLast === 0 ? 'Activo' : getDaysLabel(daysSinceLast)}
          </p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Última actividad
          </p>
        </div>
      </div>

      {/* 14-day summary */}
      <div className="flex items-center gap-4 pt-1 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-baseline gap-1.5 pt-3">
          <span className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-100">
            {activitiesLast14}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            días activos / 14
          </span>
        </div>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <Dumbbell className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span className="font-medium">{streak} días de racha</span>
        </div>
      )}

      {/* Inactivity alert */}
      {isInactive && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/40">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <span className="text-xs text-red-700 dark:text-red-300">
            Inactividad prolongada · {daysSinceLast} días
          </span>
        </div>
      )}
    </div>
  )
}
