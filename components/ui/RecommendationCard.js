'use client'

import { Lightbulb } from 'lucide-react'

export default function RecommendationCard({
  icon: Icon = Lightbulb,
  title,
  description,
  action = null,
  actionLabel = 'Ir',
  variant = 'default' // default, success, warning, info
}) {
  const variants = {
    default: {
      bg: 'bg-zinc-50 dark:bg-zinc-800/50',
      border: 'border-zinc-200/50 dark:border-zinc-700/50',
      glow: '',
      button: 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900'
    },
    success: {
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      border: 'border-emerald-200/50 dark:border-emerald-800/30',
      glow: '',
      button: 'bg-emerald-600 hover:bg-emerald-700 text-white'
    },
    warning: {
      bg: 'bg-amber-50/50 dark:bg-amber-950/20',
      border: 'border-amber-200/50 dark:border-amber-800/30',
      glow: '',
      button: 'bg-amber-600 hover:bg-amber-700 text-white'
    },
    info: {
      bg: 'bg-zinc-50 dark:bg-zinc-800/50',
      border: 'border-zinc-200/50 dark:border-zinc-700/50',
      glow: '',
      button: 'bg-terra-500 hover:bg-terra-600 text-white'
    }
  }

  const styles = variants[variant] || variants.default

  return (
    <div className={`p-4 rounded-2xl border ${styles.bg} ${styles.border} shadow-lg ${styles.glow}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Icon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            {title}
          </h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {description}
          </p>
          {action && (
            <button
              onClick={action}
              className={`mt-3 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${styles.button}`}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
