'use client'

export default function ProgressRing({
  progress = 0,
  size = 120,
  strokeWidth = 8,
  color = 'purple',
  showLabel = true,
  label = null,
  sublabel = null,
  glowColor = null
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  const colorMap = {
    purple: {
      stroke: 'stroke-black dark:stroke-white',
      text: 'text-black dark:text-white',
      bg: 'stroke-gray-300 dark:stroke-gray-700'
    },
    green: {
      stroke: 'stroke-black dark:stroke-white',
      text: 'text-black dark:text-white',
      bg: 'stroke-gray-300 dark:stroke-gray-700'
    },
    orange: {
      stroke: 'stroke-black dark:stroke-white',
      text: 'text-black dark:text-white',
      bg: 'stroke-gray-300 dark:stroke-gray-700'
    },
    blue: {
      stroke: 'stroke-black dark:stroke-white',
      text: 'text-black dark:text-white',
      bg: 'stroke-gray-300 dark:stroke-gray-700'
    },
    zinc: {
      stroke: 'stroke-black dark:stroke-white',
      text: 'text-black dark:text-white',
      bg: 'stroke-gray-300 dark:stroke-gray-700'
    }
  }

  const colors = colorMap[color] || colorMap.purple

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={colors.bg}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${colors.stroke} transition-all duration-500 ease-out`}
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${colors.text}`}>
            {label !== null ? label : `${Math.round(progress)}%`}
          </span>
          {sublabel && (
            <span className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
