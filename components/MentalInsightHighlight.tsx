'use client'

import { Zap } from 'lucide-react'

interface Insight {
  text: string
  type: 'spending_mood' | 'exercise_mood'
}

interface Props {
  insights: Insight[]
}

export default function MentalInsightHighlight({ insights }: Props) {
  if (!insights || insights.length === 0) return null

  const visibleInsights = insights.slice(0, 2)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Zap className="w-4 h-4 text-purple-500" />
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Patrón detectado
        </h3>
      </div>

      <div className="space-y-2">
        {visibleInsights.map((insight, i) => (
          <div
            key={i}
            className="rounded-2xl bg-purple-50 dark:bg-purple-900/15 border border-purple-200/60 dark:border-purple-800/40 px-5 py-4"
          >
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
              {insight.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
