'use client'

import type { GoalsOverview } from '@/lib/goals-engine'
import Card from '@/components/ui/Card'
import { Target, Wallet, Brain, Dumbbell } from 'lucide-react'

// ── Pillar Config ────────────────────────────────────────────

const PILLAR_CONFIG = {
  economy: {
    icon: Wallet,
    color: 'bg-emerald-500',
    trackColor: 'text-emerald-600 dark:text-emerald-400',
  },
  mental: {
    icon: Brain,
    color: 'bg-purple-500',
    trackColor: 'text-purple-600 dark:text-purple-400',
  },
  physical: {
    icon: Dumbbell,
    color: 'bg-orange-500',
    trackColor: 'text-orange-600 dark:text-orange-400',
  },
} as const

const STATUS_LABEL = {
  'on-track': 'En camino',
  'off-track': 'Rezagado',
} as const

// ── Component ────────────────────────────────────────────────

interface GoalsProgressProps {
  overview: GoalsOverview
}

export default function GoalsProgress({ overview }: GoalsProgressProps) {
  if (overview.activeCount === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 flex items-center gap-2">
        <Target className="w-3 h-3" />
        Objetivos activos
      </h3>

      <Card className="p-4 space-y-3">
        {overview.goals.map(goal => {
          const cfg = PILLAR_CONFIG[goal.pillar]
          const Icon = cfg.icon
          const isOffTrack = goal.status === 'off-track'

          return (
            <div key={goal.pillar}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${cfg.trackColor}`} />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                    {goal.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-medium ${
                    isOffTrack ? 'text-amber-500' : 'text-zinc-400'
                  }`}>
                    {isOffTrack ? STATUS_LABEL['off-track'] : `${goal.progressPercent}%`}
                  </span>
                </div>
              </div>

              <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    isOffTrack ? 'bg-amber-400' : cfg.color
                  }`}
                  style={{ width: `${goal.progressPercent}%` }}
                />
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
