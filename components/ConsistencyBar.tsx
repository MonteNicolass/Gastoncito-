'use client'

import { CalendarDays } from 'lucide-react'

interface Props {
  activeDays: boolean[]
  label?: string
}

export default function ConsistencyBar({ activeDays, label }: Props) {
  if (!activeDays || activeDays.length === 0) return null

  const total = activeDays.length
  const active = activeDays.filter(Boolean).length
  const ratio = active / total
  const percent = Math.round(ratio * 100)

  const getColor = () => {
    if (ratio >= 0.5) return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' }
    if (ratio >= 0.25) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' }
    return { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' }
  }

  const colors = getColor()

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-orange-500" />
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {label || 'Constancia'}
          </h3>
        </div>
        <span className={`text-sm font-bold font-mono ${colors.text}`}>
          {active} / {total}
        </span>
      </div>

      {/* Day blocks */}
      <div className="flex gap-1">
        {activeDays.map((isActive, i) => (
          <div
            key={i}
            className={`flex-1 h-6 rounded transition-colors ${
              isActive
                ? colors.bar
                : 'bg-zinc-100 dark:bg-zinc-700/50'
            }`}
          />
        ))}
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-400">
          14 días atrás
        </span>
        <span className="text-[10px] text-zinc-400">
          Hoy
        </span>
      </div>
    </div>
  )
}
