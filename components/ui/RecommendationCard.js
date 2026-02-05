'use client'

export default function RecommendationCard({
  emoji = '💡',
  title,
  description,
  action = null,
  actionLabel = 'Ir',
  variant = 'default' // default, success, warning, info
}) {
  const variants = {
    default: {
      bg: 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20',
      border: 'border-purple-200/50 dark:border-purple-500/30',
      glow: 'shadow-purple-500/10 dark:shadow-purple-500/20',
      button: 'bg-purple-500 hover:bg-purple-600 text-white'
    },
    success: {
      bg: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20',
      border: 'border-emerald-200/50 dark:border-emerald-500/30',
      glow: 'shadow-emerald-500/10 dark:shadow-emerald-500/20',
      button: 'bg-emerald-500 hover:bg-emerald-600 text-white'
    },
    warning: {
      bg: 'bg-gradient-to-br from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20',
      border: 'border-orange-200/50 dark:border-orange-500/30',
      glow: 'shadow-orange-500/10 dark:shadow-orange-500/20',
      button: 'bg-orange-500 hover:bg-orange-600 text-white'
    },
    info: {
      bg: 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20',
      border: 'border-blue-200/50 dark:border-blue-500/30',
      glow: 'shadow-blue-500/10 dark:shadow-blue-500/20',
      button: 'bg-blue-500 hover:bg-blue-600 text-white'
    }
  }

  const styles = variants[variant] || variants.default

  return (
    <div className={`p-4 rounded-2xl border ${styles.bg} ${styles.border} shadow-lg ${styles.glow}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{emoji}</div>
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
