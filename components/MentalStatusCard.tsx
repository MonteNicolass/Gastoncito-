'use client'

import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'

interface Props {
  average: number | null
  count: number
  trend: 'Mejorando' | 'Bajando' | 'Estable' | null
  delta: number | null
  lowStreak: number | null
  variability: string | null
}

function getBarColor(score: number): string {
  if (score >= 7) return 'bg-emerald-500'
  if (score >= 5) return 'bg-purple-500'
  if (score >= 3) return 'bg-amber-500'
  return 'bg-red-500'
}

function getBarBg(score: number): string {
  if (score >= 7) return 'bg-emerald-100 dark:bg-emerald-900/30'
  if (score >= 5) return 'bg-purple-100 dark:bg-purple-900/30'
  if (score >= 3) return 'bg-amber-100 dark:bg-amber-900/30'
  return 'bg-red-100 dark:bg-red-900/30'
}

function getScoreLabel(score: number): string {
  if (score >= 8) return 'Muy bien'
  if (score >= 6) return 'Bien'
  if (score >= 4) return 'Regular'
  if (score >= 2) return 'Bajo'
  return 'Muy bajo'
}

function getTextColor(score: number): string {
  if (score >= 7) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 5) return 'text-purple-600 dark:text-purple-400'
  if (score >= 3) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export default function MentalStatusCard({ average, count, trend, delta, lowStreak, variability }: Props) {
  if (average === null || count === 0) return null

  const TrendIcon = trend === 'Mejorando' ? TrendingUp : trend === 'Bajando' ? TrendingDown : Minus
  const trendColor = trend === 'Mejorando'
    ? 'text-emerald-600 dark:text-emerald-400'
    : trend === 'Bajando'
      ? 'text-red-600 dark:text-red-400'
      : 'text-zinc-500 dark:text-zinc-400'

  const barPercent = Math.min(100, (average / 10) * 100)

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-500" strokeWidth={1.75} />
          <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
            Estado mental
          </h3>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          average >= 7 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
          : average >= 5 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
          : average >= 3 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        }`}>
          {getScoreLabel(average)}
        </span>
      </div>

      {/* Score + Bar */}
      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-display font-bold tracking-tight ${getTextColor(average)}`}>
            {(Math.round(average * 10) / 10).toFixed(1)}
          </span>
          <span className="text-lg text-zinc-300 dark:text-zinc-600 font-display">/10</span>
        </div>

        {/* Visual bar */}
        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(average)}`}
            style={{ width: `${barPercent}%` }}
          />
        </div>
      </div>

      {/* Trend + Meta */}
      <div className="flex items-center gap-4">
        {trend && (
          <div className={`flex items-center gap-1.5 ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{trend}</span>
            {delta !== null && delta !== 0 && (
              <span className="text-[10px] opacity-70 font-mono">
                ({delta > 0 ? '+' : ''}{(Math.round(delta * 10) / 10).toFixed(1)})
              </span>
            )}
          </div>
        )}
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          {count} registro{count !== 1 ? 's' : ''} · 7 días
        </span>
      </div>

      {/* Low streak alert */}
      {lowStreak !== null && lowStreak >= 3 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/40">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <span className="text-xs text-red-700 dark:text-red-300">
            Estado bajo sostenido · {lowStreak} días
          </span>
        </div>
      )}
    </div>
  )
}
