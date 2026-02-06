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
      stroke: 'stroke-purple-500',
      glow: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]',
      text: 'text-purple-500 dark:text-purple-400',
      bg: 'stroke-purple-500/20'
    },
    green: {
      stroke: 'stroke-emerald-500',
      glow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]',
      text: 'text-emerald-500 dark:text-emerald-400',
      bg: 'stroke-emerald-500/20'
    },
    orange: {
      stroke: 'stroke-orange-500',
      glow: 'drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]',
      text: 'text-orange-500 dark:text-orange-400',
      bg: 'stroke-orange-500/20'
    },
    blue: {
      stroke: 'stroke-blue-500',
      glow: 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]',
      text: 'text-blue-500 dark:text-blue-400',
      bg: 'stroke-blue-500/20'
    },
    zinc: {
      stroke: 'stroke-zinc-400',
      glow: 'drop-shadow-[0_0_8px_rgba(161,161,170,0.3)]',
      text: 'text-zinc-400 dark:text-zinc-500',
      bg: 'stroke-zinc-500/20'
    }
  }

  const colors = colorMap[color] || colorMap.purple

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className={`transform -rotate-90 ${progress > 0 ? colors.glow : ''}`}
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
          <span className={`text-2xl font-display font-bold ${colors.text}`}>
            {label !== null ? label : `${Math.round(progress)}%`}
          </span>
          {sublabel && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
