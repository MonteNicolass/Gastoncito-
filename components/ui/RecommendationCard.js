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
      bg: 'bg-gray-100 dark:bg-gray-900',
      border: 'border-gray-300 dark:border-gray-700',
      button: 'bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black'
    },
    success: {
      bg: 'bg-gray-100 dark:bg-gray-900',
      border: 'border-gray-300 dark:border-gray-700',
      button: 'bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black'
    },
    warning: {
      bg: 'bg-gray-100 dark:bg-gray-900',
      border: 'border-gray-300 dark:border-gray-700',
      button: 'bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black'
    },
    info: {
      bg: 'bg-gray-100 dark:bg-gray-900',
      border: 'border-gray-300 dark:border-gray-700',
      button: 'bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black'
    }
  }

  const styles = variants[variant] || variants.default

  return (
    <div className={`p-4 border ${styles.bg} ${styles.border}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{emoji}</div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-black dark:text-white mb-1">
            {title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
          {action && (
            <button
              onClick={action}
              className={`mt-3 px-4 py-2 text-sm font-medium transition-all active:scale-95 ${styles.button}`}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
