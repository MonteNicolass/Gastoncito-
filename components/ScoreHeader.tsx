'use client'

import type { GeneralScore } from '@/lib/score/general-score'

// ── Score Ring ───────────────────────────────────────────────

const SCORE_COLORS = {
  bien: {
    ring: 'text-emerald-500',
    bg: 'text-emerald-500/20',
    label: 'text-emerald-600 dark:text-emerald-400',
  },
  atencion: {
    ring: 'text-amber-500',
    bg: 'text-amber-500/20',
    label: 'text-amber-600 dark:text-amber-400',
  },
  alerta: {
    ring: 'text-red-500',
    bg: 'text-red-500/20',
    label: 'text-red-600 dark:text-red-400',
  },
} as const

// ── Component ────────────────────────────────────────────────

interface ScoreHeaderProps {
  score: GeneralScore
}

export default function ScoreHeader({ score }: ScoreHeaderProps) {
  const colors = SCORE_COLORS[score.label]
  const circumference = 2 * Math.PI * 32
  const offset = circumference - (score.score / 100) * circumference

  return (
    <div className="flex items-center gap-4">
      {/* Ring */}
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
          <circle
            cx="36"
            cy="36"
            r="32"
            fill="none"
            strokeWidth="5"
            className={`stroke-current ${colors.bg}`}
          />
          <circle
            cx="36"
            cy="36"
            r="32"
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`stroke-current ${colors.ring} transition-all duration-700 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {score.score}
          </span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="flex-1 min-w-0 space-y-1">
        {(['economy', 'mental', 'physical'] as const).map(pillar => {
          const value = score.breakdown[pillar]
          const pillarLabel = pillar === 'economy' ? 'Money' : pillar === 'mental' ? 'Mental' : 'F\u00edsico'

          return (
            <div key={pillar} className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 w-10 flex-shrink-0">
                {pillarLabel}
              </span>
              <div className="flex-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    value >= 65 ? 'bg-emerald-400' :
                    value >= 40 ? 'bg-amber-400' :
                    'bg-red-400'
                  }`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-400 w-6 text-right tabular-nums">
                {value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
